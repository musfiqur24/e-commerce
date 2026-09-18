# Inventory history and product images

Open **Inventory history** in Admin for a collapsed list of products. Expand a product to see its variant movements, filter by movement type, and page through its history. The main list searches by product name or SKU and paginates whole products; each expanded history has independent pagination. Unlinked inventory items remain available in their own group. Product detail pages also have a history widget.

The `inventory_movement` table records changes to warehouse inventory levels in the same database transaction. Each entry keeps product/variant and warehouse names, SKU, stock before/after, and reserved quantities. Increasing physical stock records Incoming; decreasing it records Outgoing. Reservations and releases are separate from physical stock movements. Existing stock receives an Opening balance when the migration runs; earlier movements cannot be reconstructed. The log does not identify an order or staff member.

Product creation uses the standard Media upload area for multiple images. The Product PDF field is removed from creation; existing document editing is retained. Set `maxImages` in `backend/src/config/product-media.json` to change the default limit of 5, then rebuild the backend. The Admin upload and product API enforce the limit.

Storefront cards rotate images every 4 seconds when visible. Hovering, keyboard focus, opening the gallery, a hidden browser tab, or reduced-motion preferences pause rotation. Dots select an image. Cards with multiple images open a modal gallery with thumbnails and previous/next controls; Escape closes it. Single-image cards do not open a gallery. The interval is `PRODUCT_SLIDE_INTERVAL_MS` in `store/components/portal/ProductGallery.tsx`.
