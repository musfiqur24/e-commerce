export interface DocumentItem {
  id: string
  name: string
  category: string
  dateAdded: string
  fileUrl: string
}

export const mockDocuments: DocumentItem[] = [
  {
    id: '1',
    name: 'Invoice_ORD-2026-001.pdf',
    category: 'Invoices',
    dateAdded: '12/01/2026',
    fileUrl: '#',
  },
  {
    id: '2',
    name: 'Return_Policy_Terms.pdf',
    category: 'Information',
    dateAdded: '12/01/2026',
    fileUrl: '#',
  },
  {
    id: '3',
    name: 'Invoice_ORD-2026-002.pdf',
    category: 'Invoices',
    dateAdded: '12/05/2026',
    fileUrl: '#',
  },
  {
    id: '4',
    name: 'Product_Usage_Guide.pdf',
    category: 'Guides',
    dateAdded: '12/04/2026',
    fileUrl: '#',
  },
]
