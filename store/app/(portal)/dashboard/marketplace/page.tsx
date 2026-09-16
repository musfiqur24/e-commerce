"use client";

import React, { useState, useMemo, useEffect } from "react";
import { MagnifyingGlass } from "@medusajs/icons";
import PageContainer from "@/components/portal/PageContainer";
import TopImageBanner from "@/components/portal/TopImageBanner";
import Card from "@/components/portal/Card";
import ProductCard from "@/components/portal/ProductCard";
import ProductViewDetails from "@/components/portal/ProductViewDetails";
import Toast from "@/components/portal/Toast";
import Loading from "@/components/portal/Loading";
import type { Product } from "@/components/portal/ProductCard";
import { useCart } from "@/context/CartContext";
import {
  getProducts,
  SHIPPING_PRODUCT_TYPE_NAME,
} from "@/lib/medusa";


const PAGE_SIZE = 9;

interface MedusaMarketplaceProduct {
  id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  thumbnail?: string | null;
  variants?: Array<{ prices?: Array<{ amount?: number }> }>;
  categories?: Array<{ name: string }>;
  images?: Array<{ url: string }>;
  tags?: Array<{ value: string }>;
  type?: { value?: string };
}

export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    async function loadProducts() {
      try {
        setIsLoading(true);
        const data = await getProducts({
          limit: "100",
          fields: "id,title,subtitle,description,thumbnail,*variants.prices,*categories,*images,*tags,*type" // Request base product fields, raw prices, category fields, tags, and product type (used to gate S4/Shipping products)
        });

        if (!data.products || data.products.length === 0) {
          console.warn("No products returned from Medusa backend.");
          setProducts([]);
          return;
        }
        
        // Exclude the shipping product — it's a real Medusa product (so its
        // price can be managed centrally), but it isn't a sellable item and
        // gets attached to orders automatically, not added from the grid.
        // Also exclude S4 (prescription-only) products — those should only
        // ever be added to cart from the Prescriptions page via a matched
        // eRx script, not browsed/purchased directly from the marketplace.
        // Gated by the product's Type (single-select dropdown in Medusa
        // Admin), which is separate from Category.
        const sellableProducts = (
          data.products as unknown as MedusaMarketplaceProduct[]
        ).filter(
          (p) => p.type?.value !== SHIPPING_PRODUCT_TYPE_NAME
        );

        // Map Medusa products to our internal Product type
        const mappedProducts: Product[] = sellableProducts.map((p) => {
          // Get the price from the first variant's prices array
          const variant = p.variants?.[0];
          const rawPrice = variant?.prices?.[0]?.amount;

          const price = rawPrice !== undefined ? rawPrice / 100 : 0;

          // Category is multi-select (Low Testosterone / Performance &
          // Recovery / Others) — use the first as the primary display tag.
          const categoryName = p.categories?.[0]?.name || "General";

          return {
            id: p.id,
            name: p.title,
            description: p.subtitle || p.description || "No description available",
            detailedDescription: p.description || undefined,
            price: price,
            category: categoryName,
            categories: p.categories?.map((category) => category.name) || [],
            type: p.type?.value || "",
            types: p.type?.value ? [p.type.value] : [],
            tag: categoryName,
            tags: p.tags?.map((tag) => tag.value) || [],
            imageSrc: p.thumbnail || p.images?.[0]?.url || "",
          };
        });

        setProducts(mappedProducts);
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadProducts();
  }, []);

  /* ── Filtered products ── */
  const filtered = useMemo(() => {
    let list = products;

    // Filter by category
    if (activeTab !== "All") {
      list = list.filter((p) => p.category === activeTab || p.categories?.includes(activeTab));
    }

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    return list;
  }, [activeTab, search, products]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(
    pageIndex * PAGE_SIZE,
    (pageIndex + 1) * PAGE_SIZE
  );

  // Dynamic filter tabs based on actual categories in products
  const dynamicFilterTabs = useMemo(() => {
    const categorySet = new Set<string>();
    products.forEach((p) => {
      if (p.category) categorySet.add(p.category);
    });
    return ["All", ...Array.from(categorySet)].sort();
  }, [products]);

  // Reset page when filter changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setPageIndex(0);
  };

  return (
    <PageContainer
      breadcrumb={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Marketplace" },
      ]}
    >
      <div className="mx-auto w-full space-y-4">
        <TopImageBanner title="Marketplace" />

        <Card
          title="All Products"
          noPadding
          className="overflow-hidden rounded-lg border-0 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04)]"
          headerClassName="min-h-0 px-3 py-3 md:px-6 md:py-4"
          titleClassName="text-base font-normal leading-[1.1]"
        >
          <div className="flex flex-col gap-4 px-3 pb-4 pt-4 md:px-6">
          {/* Filter Tabs + Search */}
          <div className="flex flex-col items-stretch gap-4 md:flex-row md:items-end md:justify-between">
            {/* Tabs */}
            <div className="flex min-w-0 items-start justify-between gap-6 overflow-x-auto border-b border-neutral-200 md:justify-start">
              {dynamicFilterTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`shrink-0 border-b-2 pb-3 text-[13px] font-normal leading-[1.1] transition-colors ${
                    activeTab === tab
                      ? "border-neutral-500 text-[#1c1c1c]"
                      : "border-transparent text-[#8d8d8d] hover:text-neutral-700"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full md:w-70 md:shrink-0">
              <MagnifyingGlass className="absolute left-2 top-1/2 size-3.75 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder="Search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPageIndex(0);
                }}
                className="h-10 w-full rounded-md border-0 bg-[#f9f9f9] py-2 pl-8 pr-3 text-[13px] leading-[1.1] text-neutral-700 shadow-[0_1px_2px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.08)] outline-none placeholder:text-[#8d8d8d] focus:ring-2 focus:ring-neutral-300"
              />
            </div>
          </div>

          {/* Product Grid */}
          {isLoading ? (
            <Loading
              variant="inline"
              layout="marketplace"
              message="Fetching products from store..."
            />
          ) : paginated.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3">
              {paginated.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onViewDetails={(p) => setSelectedProduct(p)}
                  onAddToCart={(p) => {
                    addToCart(p);
                    setShowToast(true);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-16 text-sm text-neutral-400">
              No products found matching your criteria.
            </div>
          )}

          {/* Pagination */}
          {!isLoading && filtered.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-normal leading-[1.1] text-[#757575]">
                {pageIndex * PAGE_SIZE + 1} —{" "}
                {Math.min((pageIndex + 1) * PAGE_SIZE, filtered.length)} of{" "}
                {filtered.length} results
              </span>
              <div className="flex items-center gap-2">
                <span className="hidden px-2 py-1 text-[13px] font-normal leading-[1.1] text-[#757575] sm:inline">
                  {pageIndex + 1} of {pageCount} pages
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                    disabled={pageIndex === 0}
                    className="h-7 rounded-md px-2 text-[13px] font-normal leading-[1.1] text-[#757575] shadow-[0_1px_1px_rgba(0,0,0,0.12)] transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:text-[#a5a5a5]"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() =>
                      setPageIndex((p) => Math.min(pageCount - 1, p + 1))
                    }
                    disabled={pageIndex >= pageCount - 1}
                    className="h-7 rounded-md px-2 text-[13px] font-normal leading-[1.1] text-[#757575] transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:text-[#a5a5a5]"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
          </div>
        </Card>
      </div>

      {/* Product Detail Modal */}
      <ProductViewDetails
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={(p) => {
          addToCart(p);
          setShowToast(true);
        }}
      />
      {/* Toast Notification */}
      <Toast 
        isOpen={showToast} 
        onClose={() => setShowToast(false)} 
        message="Successfully added to cart" 
        variant="success"
      />
    </PageContainer>
  );
}
