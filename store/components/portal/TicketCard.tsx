import React from 'react'
import { Ticket } from '@/types/support'

interface TicketCardProps {
  ticket: Ticket
}

export default function TicketCard({ ticket }: TicketCardProps) {
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04)]">
      {/* Header */}
      <div className="flex flex-col gap-3 bg-[#eee] px-3 py-3 sm:flex-row sm:items-center sm:gap-6 sm:px-6">
        <div className="border-b border-neutral-300 pb-3 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-6">
          <span className="block text-sm font-normal leading-[1.6] text-[#757575]">
            Ticket ID
          </span>
          <span className="text-base font-normal leading-[1.6] text-[#1c1c1c] sm:text-lg">
            {ticket.ticketId}
          </span>
        </div>
        <div>
          <span className="block text-sm font-normal leading-[1.6] text-[#757575]">
            Ticket Creation Date
          </span>
          <span className="text-base font-normal leading-[1.6] text-[#1c1c1c] sm:text-lg">
            {ticket.creationDate}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="space-y-3 px-3 py-4 sm:px-6">
        <div className="space-y-1">
          <h3 className="text-lg font-normal leading-[1.25] tracking-[-0.1728px] text-[#1c1c1c]">
            {ticket.title}
          </h3>
          <p className="text-base font-normal leading-[1.6] text-[#757575]">
            {ticket.description}
          </p>
        </div>

        {/* Response Box */}
        {ticket.ticketstatus && (
          <div className="flex items-stretch gap-1">
            <div className="w-1 shrink-0 rounded-full bg-[#2563eb]" />
            <div className="flex-1 rounded-bl rounded-br-lg rounded-tl rounded-tr-lg border-[0.5px] border-[#bfdbfe] bg-[#eff6ff] px-3 py-2">
              <p className="text-xs font-normal leading-[1.6] text-[#424242]">
                {ticket.ticketstatus}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
