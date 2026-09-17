import { initialStockSchema } from '../../lib/product-stock'
import { ProductStockField } from '../components/product-stock-field'

export default {
  model: 'product',
  link: [],
  forms: [{
    zone: 'create',
    tab: 'general',
    fields: {
      initial_stock: {
        label: 'Starting stock',
        description: 'Enter the pieces currently in your warehouse for each variant. Leave blank to set stock later.',
        validation: initialStockSchema,
        defaultValue: null,
        component: ProductStockField,
      },
    },
  }],
}
