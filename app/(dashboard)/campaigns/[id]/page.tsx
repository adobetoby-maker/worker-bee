'use client'
import { use } from 'react'
import CampaignBuilder from '../CampaignBuilder'

export default function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <CampaignBuilder campaignId={id} />
}
