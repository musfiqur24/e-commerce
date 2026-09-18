'use client'

import React from 'react'
import { EyeMini, MinusMini } from '@medusajs/icons'
import PageContainer from '@/components/portal/PageContainer'
import TopImageBanner from '@/components/portal/TopImageBanner'
import Card from '@/components/portal/Card'
import Button from '@/components/portal/Button'
import DataTable, { TableColumn } from '@/components/portal/Table'
import { mockDocuments } from './mockData'

export default function DocumentsPage() {
  const columns: TableColumn[] = [
    {
      key: 'name',
      label: 'Document Name',
      width: '36%',
      align: 'left',
      render: (value) => (
        <span className="text-lg font-medium leading-tight tracking-[-0.1728px] text-[#1c1c1c]">
          {String(value ?? '')}
        </span>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      width: '21%',
      align: 'left',
      render: (value) => (
        <span className="text-[#1c1c1c]">{String(value ?? '')}</span>
      ),
    },
    {
      key: 'dateAdded',
      label: 'Date Added',
      width: '21%',
      align: 'left',
      render: (value) => (
        <span className="text-[#1c1c1c]">{String(value ?? '')}</span>
      ),
    },
    {
      key: 'action',
      label: 'Action',
      width: '22%',
      align: 'left',
      render: (_, row) => (
        <div className="flex justify-start">
          <Button
            variant="secondary"
            size="small"
            className="flex h-7 items-center gap-1.5 rounded-md border-0 bg-white px-2 text-[#1c1c1c] shadow-[0_1px_2px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.08)]"
            onClick={() => window.open(String(row.fileUrl ?? ''), '_blank')}
          >
            <EyeMini className="size-3.75" />
            <span className="text-[13px] font-normal leading-[1.1]">View</span>
          </Button>
        </div>
      ),
    },
  ]

  return (
    <PageContainer
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Documents' },
      ]}
    >
      <div className="mx-auto w-full space-y-4">
        <TopImageBanner title="Documents" />

        <Card
          title="All Documents"
          noPadding
          className="overflow-hidden rounded-lg border-0 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04)]"
          headerClassName="min-h-[43px] px-3 py-3 md:min-h-[51px] md:px-6 md:py-4"
          titleClassName="text-base font-medium leading-[1.1] text-[#1c1c1c]"
        >
          {mockDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-medium text-neutral-800">No documents yet</p>
              <p className="mt-1 text-xs text-neutral-500">
                You do not have any documents available at this time.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden px-6 pt-4 md:block">
                <DataTable
                  columns={columns}
                  data={mockDocuments}
                  variant="documents"
                  pagination={{
                    count: mockDocuments.length,
                    pageSize: 10,
                    pageIndex: 0,
                    pageCount: Math.ceil(mockDocuments.length / 10),
                  }}
                />
              </div>

              {/* Mobile Card View */}
              <div className="space-y-3 px-3 pb-4 pt-3 md:hidden">
                {mockDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-col gap-4 rounded-lg bg-white p-3 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.1)]"
                  >
                    <h4 className="text-lg font-medium leading-tight tracking-[-0.1728px] text-[#1c1c1c]">
                      {doc.name}
                    </h4>

                    <div className="border-y border-[#e0e0e0]">
                      <div className="flex h-9.5 items-center justify-between text-sm font-normal leading-[1.6] text-[#757575]">
                        <span>Category</span>
                        <span className="text-right">{doc.category}</span>
                      </div>
                      <div className="flex h-9.5 items-center justify-between border-t border-[#e0e0e0] text-sm font-normal leading-[1.6] text-[#757575]">
                        <span>Date Added</span>
                        <span className="text-right">{doc.dateAdded}</span>
                      </div>
                    </div>

                    <Button
                      variant="secondary"
                      fullWidth
                      onClick={() => window.open(doc.fileUrl, '_blank')}
                      className="flex h-10 items-center justify-center gap-1.5 rounded-md border-0 bg-white px-5 text-[#1c1c1c] shadow-[0_1px_2px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.08)]"
                    >
                      <EyeMini className="size-3.75" />
                      <span className="text-sm font-medium leading-[1.1]">
                        View Details
                      </span>
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
    </PageContainer>
  )
}
