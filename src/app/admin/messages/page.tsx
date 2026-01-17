'use client'

import { useState } from 'react'
import { useGame } from '@/hooks/useGame'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Copy, CheckCircle } from 'lucide-react'
import { formatGameDate } from '@/lib/utils'
import { GAME_CONFIG } from '@/lib/constants'
import { useToast } from '@/hooks/use-toast'

type MessageType = 'priority' | 'spots_available' | 'payment_reminder'

const CONFIRMED_STATUSES = ['priority_confirmed', 'lottery_selected', 'confirmed'] as const

export default function MessagesPage() {
  const { game, players, loading } = useGame()
  const [messageType, setMessageType] = useState<MessageType>('priority')
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (!game) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">WhatsApp Messages</h1>
          <p className="text-gray-600 mt-2">No game scheduled</p>
        </div>
      </div>
    )
  }

  const priorityPlayers = players.filter(p => p.status === 'priority_invited')
  const unpaidPlayers = players.filter(
    p => CONFIRMED_STATUSES.includes(p.status as typeof CONFIRMED_STATUSES[number]) && p.payment_status === 'pending'
  )

  function generateMessage(): string {
    const gameDate = formatGameDate(game.game_date)
    const gameTime = GAME_CONFIG.START_TIME

    switch (messageType) {
      case 'priority':
        const priorityMentions = priorityPlayers.map((p) => `@${p.player.whatsapp_name}`).join(' ')
        return `🏆 *PRIORITY INVITES - ${gameDate}*

${priorityMentions}

You've been selected for priority registration! ⚽

Please confirm your attendance by Thursday night at 12am (midnight).

Reply with:
✅ IN - I'm playing
❌ OUT - Can't make it

Game Details:
📅 ${gameDate}
⏰ ${gameTime}
📍 ${GAME_CONFIG.LOCATION}
💰 $${GAME_CONFIG.PAYMENT_AMOUNT}

If you decline or don't respond by the deadline, your spot opens to everyone else.

See you on the pitch! ⚽🔥`

      case 'spots_available':
        const confirmedPlayers = players.filter(p =>
          CONFIRMED_STATUSES.includes(p.status as typeof CONFIRMED_STATUSES[number]) &&
          (p.payment_status === 'pending' || p.payment_status === 'marked_paid' || p.payment_status === 'verified')
        )
        const availableCount = 16 - confirmedPlayers.length
        return `⚡ *SPOTS AVAILABLE NOW - ${gameDate}*

🎉 ${availableCount} spot(s) available for the next game!

First come, first served! Click the link to join:
👉 https://dropin-fc.app/dashboard

Game Details:
📅 ${gameDate}
⏰ ${gameTime}
📍 ${GAME_CONFIG.LOCATION}
💰 $${GAME_CONFIG.PAYMENT_AMOUNT}

Payment due by Saturday night at 12am (midnight)

Spots fill up FAST - don't wait! ⚽🔥`

      case 'payment_reminder':
        const unpaidMentions = unpaidPlayers.map((p) => `@${p.player.whatsapp_name}`).join(' ')
        return `💰 *PAYMENT REMINDER - ${gameDate}*

${unpaidMentions}

Friendly reminder: Payment deadline is Saturday night at 12am (midnight).

Please send $${GAME_CONFIG.PAYMENT_AMOUNT} via e-transfer to [payment email]

If payment isn't received by the deadline, your spot will be opened up for everyone else.

Thanks! ⚽`

      default:
        return ''
    }
  }

  const message = generateMessage()

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message)
    setCopied(true)
    toast({
      title: "Copied!",
      description: "Message copied to clipboard. Ready to paste in WhatsApp.",
    })
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">WhatsApp Messages</h1>
        <p className="text-gray-600 mt-2">Generate messages with @mentions for the group</p>
      </div>

      {/* Message Type Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Message Type</CardTitle>
          <CardDescription>Choose which message you want to generate</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={messageType} onValueChange={(value) => setMessageType(value as MessageType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">
                Priority Invites ({priorityPlayers.length} players)
              </SelectItem>
              <SelectItem value="spots_available">
                Spots Available ({16 - players.filter(p =>
                  CONFIRMED_STATUSES.includes(p.status as typeof CONFIRMED_STATUSES[number]) &&
                  (p.payment_status === 'pending' || p.payment_status === 'marked_paid' || p.payment_status === 'verified')
                ).length} open)
              </SelectItem>
              <SelectItem value="payment_reminder">
                Payment Reminder ({unpaidPlayers.length} unpaid)
              </SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Generated Message */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Generated Message</CardTitle>
              <CardDescription>Copy and paste into WhatsApp group</CardDescription>
            </div>
            <Button onClick={handleCopy} variant="outline" size="sm">
              {copied ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg">
            <pre className="whitespace-pre-wrap font-sans text-sm">{message}</pre>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p>1. Select the message type you want to generate</p>
          <p>2. Click "Copy" to copy the message to your clipboard</p>
          <p>3. Open WhatsApp group and paste the message</p>
          <p>4. The @mentions will automatically tag the correct players</p>
          <p className="pt-2 text-xs italic">
            Note: Make sure player WhatsApp names match their actual WhatsApp display names for
            @mentions to work
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
