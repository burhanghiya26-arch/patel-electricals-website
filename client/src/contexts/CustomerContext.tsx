import { createContext, useContext } from "react";
import { trpc } from "@/lib/trpc";

type CustomerContextType = {
  user: any;
  loading: boolean;
  isLoggedIn: boolean;
  refresh: () => void;
};

const CustomerContext = createContext<CustomerContextType>({
  user: null,
  loading: true,
  isLoggedIn: false,
  refresh: () => {},
});

export function CustomerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = trpc.customer.getMyData.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: true,
  });

  return (
    <CustomerContext.Provider
      value={{
        user: me.data?.user ?? null,
        loading: me.isLoading,
        isLoggedIn: !!me.data?.user,
        refresh: () => me.refetch(),
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomer() {
  return useContext(CustomerContext);
}