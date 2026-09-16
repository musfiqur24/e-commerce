'use client'

import React, { useState } from 'react'
import { PlusMini, TriangleRightMini } from '@medusajs/icons'
import PageContainer from '@/components/portal/PageContainer'
import TopImageBanner from '@/components/portal/TopImageBanner'
import Card from '@/components/portal/Card'
import Button from '@/components/portal/Button'
import TicketCard from '@/components/portal/TicketCard'
import CreateTicketModal, {
  type TicketCategoryOption,
} from '@/components/portal/CreateTicketModal'
import Toast from '@/components/portal/Toast'
import { Ticket } from '@/types/support'

const faqs = [
  {
    question: 'How long does shipping take?',
    answer: 'Standard shipping takes 3–5 business days depending on your location. Express shipping is typically delivered within 1–2 business days.',
  },
  {
    question: 'How can I track my order?',
    answer: 'You can track dispatched orders from the Orders page in your dashboard using the Track Delivery button.',
  },
  {
    question: 'What is your return and refund policy?',
    answer: 'Items can be returned within 30 days of delivery if unopened and in original packaging. Contact support to initiate a return.',
  },
  {
    question: 'How do I contact customer support?',
    answer: 'Submit an inquiry through the "Create Ticket" button on this page, or send an email to support with your order number.',
  },
  {
    question: 'How do I update my shipping details?',
    answer: 'You can update your default shipping address from the Profile page. For orders already placed, please contact support immediately.',
  },
]

const DEFAULT_CATEGORIES: TicketCategoryOption[] = [
  { label: 'Order Inquiry', value: 'order_inquiry' },
  { label: 'Shipping & Delivery', value: 'shipping' },
  { label: 'Returns & Refunds', value: 'returns' },
  { label: 'Product Information', value: 'product_info' },
  { label: 'Account / General', value: 'general' },
]

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<'Open' | 'Closed'>('Open')
  const [tickets, setTickets] = useState<Ticket[]>([
    {
      id: 'demo-1',
      ticketId: 'SUP-101',
      creationDate: new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      title: 'Welcome to Customer Support',
      description: 'Our customer support team is here to assist with any questions about your orders, shipping, and products.',
      status: 'Open',
      ticketstatus: 'Active',
    },
  ])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expandedFaq, setExpandedFaq] = useState(0)

  const [toast, setToast] = useState<{
    isOpen: boolean
    message: string
    variant: 'success' | 'error'
  }>({
    isOpen: false,
    message: '',
    variant: 'success',
  })

  const showToast = (message: string, variant: 'success' | 'error' = 'success') => {
    setToast({ isOpen: true, message, variant })
  }

  const handleOpenTicketModal = () => {
    setIsModalOpen(true)
  }

  const handleCreateTicket = async (
    subject: string,
    content: string,
  ): Promise<boolean> => {
    setIsSubmitting(true)
    try {
      const newTicket: Ticket = {
        id: `ticket-${Date.now()}`,
        ticketId: `SUP-${Math.floor(1000 + Math.random() * 9000)}`,
        creationDate: new Date().toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
        title: subject,
        description: content,
        status: 'Open',
        ticketstatus: 'Under Review',
      }
      setTickets((prev) => [newTicket, ...prev])
      showToast('Support ticket created successfully', 'success')
      setIsModalOpen(false)
      return true
    } catch {
      showToast('Failed to create ticket. Please try again.', 'error')
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredTickets = tickets.filter((ticket) => ticket.status === activeTab)

  return (
    <PageContainer
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Support' },
      ]}
    >
      <div className="space-y-4">
        <TopImageBanner title="Support" />

        <div className="flex justify-end">
          <Button
            className="bg-brand-primary text-white border-none shadow-none text-xs rounded-lg inline-flex items-center gap-2 px-3 py-2"
            onClick={handleOpenTicketModal}
          >
            <PlusMini className="w-4 h-4" />
            <span>Create Ticket</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Tickets */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-4 bg-white border border-neutral-200 rounded-xl">
              <div className="flex border-b border-neutral-200 mb-4">
                <button
                  className={`pb-2 px-4 text-xs font-medium border-b-2 transition-colors ${
                    activeTab === 'Open'
                      ? 'border-brand-primary text-brand-primary'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700'
                  }`}
                  onClick={() => setActiveTab('Open')}
                >
                  Open Tickets ({tickets.filter((t) => t.status === 'Open').length})
                </button>
                <button
                  className={`pb-2 px-4 text-xs font-medium border-b-2 transition-colors ${
                    activeTab === 'Closed'
                      ? 'border-brand-primary text-brand-primary'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700'
                  }`}
                  onClick={() => setActiveTab('Closed')}
                >
                  Closed Tickets ({tickets.filter((t) => t.status === 'Closed').length})
                </button>
              </div>

              {filteredTickets.length === 0 ? (
                <div className="text-center py-10 text-neutral-400 text-xs">
                  No {activeTab.toLowerCase()} tickets found.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTickets.map((ticket) => (
                    <TicketCard key={ticket.id} ticket={ticket} />
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Right Column: FAQs */}
          <div className="space-y-4">
            <Card className="p-4 bg-white border border-neutral-200 rounded-xl">
              <h2 className="text-sm font-semibold text-neutral-900 mb-3">
                Frequently Asked Questions
              </h2>
              <div className="space-y-2">
                {faqs.map((faq, index) => (
                  <div
                    key={index}
                    className="border border-neutral-100 rounded-lg p-3 cursor-pointer hover:bg-neutral-50 transition-colors"
                    onClick={() =>
                      setExpandedFaq(expandedFaq === index ? -1 : index)
                    }
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-neutral-800">
                        {faq.question}
                      </span>
                      <TriangleRightMini
                        className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${
                          expandedFaq === index ? 'rotate-90' : ''
                        }`}
                      />
                    </div>
                    {expandedFaq === index && (
                      <p className="mt-2 text-xs text-neutral-500 leading-relaxed">
                        {faq.answer}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>

      <CreateTicketModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={async (subject, content) => handleCreateTicket(subject, content)}
        isSubmitting={isSubmitting}
        categoryOptions={DEFAULT_CATEGORIES}
        isLoadingCategories={false}
      />

      <Toast
        isOpen={toast.isOpen}
        onClose={() => setToast((prev) => ({ ...prev, isOpen: false }))}
        message={toast.message}
        variant={toast.variant}
      />
    </PageContainer>
  )
}
