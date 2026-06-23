import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ProductCatalog from "./pages/ProductCatalog";
import ProductDetail from "./pages/ProductDetail";
import ShoppingCart from "./pages/ShoppingCart";
import Checkout from "./pages/Checkout";
import OrderTracking from "./pages/OrderTracking";
import ShipmentTracking from "./pages/ShipmentTracking";
import AdvancedSearch from "./pages/AdvancedSearch";
import DealerProfile from "./pages/DealerProfile";
import AdminDashboard from "./pages/AdminDashboard";
import AdminProducts from "./pages/AdminProducts";
import AdminOrders from "./pages/AdminOrders";
import AdminQuotations from "./pages/AdminQuotations";
import AdminDealers from "./pages/AdminDealers";
import AdminShipping from "./pages/AdminShipping";
import AdminInventory from "./pages/AdminInventory";
import AdminCustomers from "./pages/AdminCustomers";
import AdminCategories from "./pages/AdminCategories";
import AdminReviews from "./pages/AdminReviews";
import AdminLogin from "./pages/AdminLogin";


function Router() {
  return (
    <Switch>
      {/* Public Pages */}
      <Route path={"/"} component={Home} />
      <Route path={"/products"} component={ProductCatalog} />
      <Route path={"/products/:id"} component={ProductDetail} />
      
      {/* Dealer/Customer Pages */}
      <Route path={"/cart"} component={ShoppingCart} />
      <Route path={"/checkout"} component={Checkout} />
      <Route path={"/orders/:id"} component={OrderTracking} />
      <Route path={"/shipment-tracking"} component={ShipmentTracking} />
      <Route path={"/search"} component={AdvancedSearch} />
      <Route path={"/profile"} component={DealerProfile} />
      
      {/* Admin Pages */}
      <Route path={"/admin/login"} component={AdminLogin} />
      <Route path={"/admin"} component={AdminDashboard} />
      <Route path={"/admin/products"} component={AdminProducts} />
      <Route path={"/admin/orders"} component={AdminOrders} />
      <Route path={"/admin/quotations"} component={AdminQuotations} />
      <Route path={"/admin/dealers"} component={AdminDealers} />
      <Route path={"/admin/shipping"} component={AdminShipping} />
      <Route path="/admin/inventory" component={AdminInventory} />
      <Route path="/admin/customers" component={AdminCustomers} />
      <Route path="/admin/categories" component={AdminCategories} />
      <Route path="/admin/reviews" component={AdminReviews} />

      
      {/* 404 */}
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
