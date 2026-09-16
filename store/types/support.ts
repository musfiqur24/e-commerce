export interface Ticket {
  id: string
  ticketId: string
  creationDate: string
  title: string
  description: string
  status: 'Open' | 'Closed'
  ticketstatus?: string
  lastResponse?: string
}
