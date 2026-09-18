import { Migration } from '@medusajs/framework/mikro-orm/migrations'

export class Migration20260918060000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE inventory_movement (
        id text PRIMARY KEY,
        inventory_item_id text NOT NULL,
        location_id text NOT NULL,
        kind text NOT NULL,
        payload jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
        updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
        deleted_at timestamptz
      );
      CREATE INDEX inventory_movement_item_time ON inventory_movement (inventory_item_id, created_at DESC);
      CREATE INDEX inventory_movement_time ON inventory_movement (created_at DESC, id);
      CREATE INDEX inventory_movement_products ON inventory_movement USING gin ((payload->'products'));

      CREATE FUNCTION inventory_movement_snapshot(item_id text, warehouse_id text) RETURNS jsonb
      LANGUAGE sql STABLE AS $$
        SELECT jsonb_build_object(
          'sku', (SELECT sku FROM inventory_item WHERE id = item_id),
          'warehouse', (SELECT name FROM stock_location WHERE id = warehouse_id),
          'products', COALESCE((SELECT jsonb_agg(jsonb_build_object(
            'id', p.id, 'title', p.title, 'variant_id', v.id, 'variant', v.title))
            FROM product_variant_inventory_item link
            JOIN product_variant v ON v.id = link.variant_id
            JOIN product p ON p.id = v.product_id
            WHERE link.inventory_item_id = item_id AND link.deleted_at IS NULL), '[]'::jsonb)
        )
      $$;

      INSERT INTO inventory_movement (id, inventory_item_id, location_id, kind, payload)
      SELECT 'imov_' || md5(id || ':opening'), inventory_item_id, location_id, 'opening',
        inventory_movement_snapshot(inventory_item_id, location_id) || jsonb_build_object(
          'stock_before', stocked_quantity, 'stock_after', stocked_quantity, 'stock_change', 0,
          'reserved_before', reserved_quantity, 'reserved_after', reserved_quantity, 'reserved_change', 0)
      FROM inventory_level WHERE deleted_at IS NULL;

      CREATE FUNCTION capture_inventory_movement() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE
        previous_stock numeric := 0;
        previous_reserved numeric := 0;
        next_stock numeric := 0;
        next_reserved numeric := 0;
        item_id text;
        warehouse_id text;
        movement_kind text;
      BEGIN
        IF TG_OP <> 'INSERT' THEN
          item_id := OLD.inventory_item_id; warehouse_id := OLD.location_id;
          IF OLD.deleted_at IS NULL THEN
            previous_stock := OLD.stocked_quantity; previous_reserved := OLD.reserved_quantity;
          END IF;
        END IF;
        IF TG_OP <> 'DELETE' THEN
          item_id := NEW.inventory_item_id; warehouse_id := NEW.location_id;
          IF NEW.deleted_at IS NULL THEN
            next_stock := NEW.stocked_quantity; next_reserved := NEW.reserved_quantity;
          END IF;
        END IF;
        IF next_stock = previous_stock AND next_reserved = previous_reserved THEN RETURN NULL; END IF;
        movement_kind := CASE
          WHEN next_stock > previous_stock THEN 'incoming'
          WHEN next_stock < previous_stock THEN 'outgoing'
          WHEN next_reserved > previous_reserved THEN 'reserved'
          ELSE 'released' END;
        INSERT INTO inventory_movement (id, inventory_item_id, location_id, kind, payload)
        VALUES ('imov_' || md5(random()::text || clock_timestamp()::text), item_id, warehouse_id, movement_kind,
          inventory_movement_snapshot(item_id, warehouse_id) || jsonb_build_object(
            'stock_before', previous_stock, 'stock_after', next_stock, 'stock_change', next_stock - previous_stock,
            'reserved_before', previous_reserved, 'reserved_after', next_reserved, 'reserved_change', next_reserved - previous_reserved));
        RETURN NULL;
      END $$;
      CREATE TRIGGER inventory_movement_capture
        AFTER INSERT OR UPDATE OR DELETE ON inventory_level
        FOR EACH ROW EXECUTE FUNCTION capture_inventory_movement();
    `)
  }

  async down(): Promise<void> {
    this.addSql(`DROP TRIGGER IF EXISTS inventory_movement_capture ON inventory_level;
      DROP FUNCTION IF EXISTS capture_inventory_movement();
      DROP FUNCTION IF EXISTS inventory_movement_snapshot(text, text);
      DROP TABLE IF EXISTS inventory_movement;`)
  }
}
