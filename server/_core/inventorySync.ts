import * as db from "../db";

const LOW_STOCK_THRESHOLD = 10; // Default low stock threshold

export interface InventorySyncResult {
  productId: number;
  previousStock: number;
  newStock: number;
  change: number;
  timestamp: Date;
  isLowStock: boolean;
}

export interface LowStockAlert {
  productId: number;
  productName: string;
  currentStock: number;
  threshold: number;
  reorderQuantity: number;
  lastAlertTime?: Date;
}

/**
 * Update inventory when order is placed
 */
export async function syncInventoryOnOrder(
  orderId: number,
  orderItems: Array<{ productId: number; quantity: number }>
): Promise<InventorySyncResult[]> {
  const results: InventorySyncResult[] = [];

  for (const item of orderItems) {
    const inventory = await db.getInventoryByProductId(item.productId);
    if (!inventory) continue;

    const previousStock = inventory.quantityInStock || 0;
    const newStock = Math.max(0, previousStock - item.quantity);

    // Update inventory in database
    await db.upsertInventory(item.productId, {
      quantityInStock: newStock,
      lastUpdated: new Date(),
    });

    const result: InventorySyncResult = {
      productId: item.productId,
      previousStock,
      newStock,
      change: -item.quantity,
      timestamp: new Date(),
      isLowStock: newStock <= LOW_STOCK_THRESHOLD,
    };

    results.push(result);

    // Log to audit trail
    await logInventoryChange({
      productId: item.productId,
      previousStock,
      newStock,
      reason: `Order #${orderId} placed`,
      type: "order_placed",
    });
  }

  return results;
}

/**
 * Update inventory when order is cancelled
 */
export async function syncInventoryOnCancellation(
  orderId: number,
  orderItems: Array<{ productId: number; quantity: number }>
): Promise<InventorySyncResult[]> {
  const results: InventorySyncResult[] = [];

  for (const item of orderItems) {
    const inventory = await db.getInventoryByProductId(item.productId);
    if (!inventory) continue;

    const previousStock = inventory.quantityInStock || 0;
    const newStock = previousStock + item.quantity;

    // Update inventory in database
    await db.upsertInventory(item.productId, {
      quantityInStock: newStock,
      lastUpdated: new Date(),
    });

    const result: InventorySyncResult = {
      productId: item.productId,
      previousStock,
      newStock,
      change: item.quantity,
      timestamp: new Date(),
      isLowStock: newStock <= LOW_STOCK_THRESHOLD,
    };

    results.push(result);

    // Log to audit trail
    await logInventoryChange({
      productId: item.productId,
      previousStock,
      newStock,
      reason: `Order #${orderId} cancelled`,
      type: "order_cancelled",
    });
  }

  return results;
}

/**
 * Get all products with low stock
 */
export async function getLowStockAlerts(): Promise<LowStockAlert[]> {
  const allProducts = await db.getAllProducts(1000, 0);
  const alerts: LowStockAlert[] = [];

  for (const product of allProducts) {
    const inventory = await db.getInventoryByProductId(product.id);
    if (inventory && inventory.quantityInStock <= LOW_STOCK_THRESHOLD) {
      alerts.push({
        productId: product.id,
        productName: product.name,
        currentStock: inventory.quantityInStock || 0,
        threshold: LOW_STOCK_THRESHOLD,
        reorderQuantity: Math.max(50, inventory.quantityInStock * 2), // Suggest reorder quantity
      });
    }
  }

  return alerts.sort((a, b) => a.currentStock - b.currentStock);
}

/**
 * Get inventory change history for a product
 */
export async function getInventoryHistory(
  productId: number,
  limit: number = 50
): Promise<Array<{
  id: number;
  productId: number;
  previousStock: number;
  newStock: number;
  reason: string;
  type: string;
  timestamp: Date;
}>> {
  // This would typically query from an inventory_audit_log table
  // For now, returning empty array - implement based on your audit log table
  return [];
}

/**
 * Log inventory change to audit trail
 */
async function logInventoryChange(data: {
  productId: number;
  previousStock: number;
  newStock: number;
  reason: string;
  type: string;
}): Promise<void> {
  // Log to console for now - implement database logging based on your schema
  console.log(`[Inventory Sync] Product ${data.productId}: ${data.previousStock} → ${data.newStock} (${data.reason})`);
}

/**
 * Bulk update inventory from external source
 */
export async function bulkUpdateInventory(
  updates: Array<{ productId: number; quantityInStock: number }>
): Promise<InventorySyncResult[]> {
  const results: InventorySyncResult[] = [];

  for (const update of updates) {
    const inventory = await db.getInventoryByProductId(update.productId);
    if (!inventory) continue;

    const previousStock = inventory.quantityInStock || 0;
    const newStock = update.quantityInStock;

    await db.upsertInventory(update.productId, {
      quantityInStock: newStock,
      lastUpdated: new Date(),
    });

    results.push({
      productId: update.productId,
      previousStock,
      newStock,
      change: newStock - previousStock,
      timestamp: new Date(),
      isLowStock: newStock <= LOW_STOCK_THRESHOLD,
    });

    await logInventoryChange({
      productId: update.productId,
      previousStock,
      newStock,
      reason: "Bulk inventory update",
      type: "bulk_update",
    });
  }

  return results;
}

/**
 * Get inventory sync status
 */
export async function getInventorySyncStatus(): Promise<{
  totalProducts: number;
  lowStockCount: number;
  lastSyncTime: Date;
  syncStatus: "healthy" | "warning" | "critical";
}> {
  const alerts = await getLowStockAlerts();
  const allProducts = await db.getAllProducts(1000, 0);

  let syncStatus: "healthy" | "warning" | "critical" = "healthy";
  if (alerts.length > 20) syncStatus = "critical";
  else if (alerts.length > 10) syncStatus = "warning";

  return {
    totalProducts: allProducts.length,
    lowStockCount: alerts.length,
    lastSyncTime: new Date(),
    syncStatus,
  };
}
