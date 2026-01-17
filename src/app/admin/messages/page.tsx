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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Copy, CheckCircle, MessageSquare } from 'lucide-react'
import { formatGameDate, formatTime } from '@/lib/utils'
import { GAME_CONFIG } from '@/lib/constants'
import { useToast } from '@/hooks/use-toast'

type MessageType = 'priority' | 'spots_available' | 'spot_reopened' | 'payment_reminder' | 'teams'

const CONFIRMED_STATUSES = ['priority_confirmed', 'lottery_selected', 'confirmed'] as const

function filterByTeam<T extends { team?: string | null }>(players: T[], team: 'dark' | 'light'): T[] {
  return players.filter(p => p.team === team)
}

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

  const darkTeam = filterByTeam(players, 'dark')
  const lightTeam = filterByTeam(players, 'light')

  function generateMessage(): string {
    const gameDate = formatGameDate(game.game_date)
    const gameTime = GAME_CONFIG.START_TIME

    switch (messageType) {
      case 'priority':
        const priorityMentions = priorityPlayers.map((p) => `@${p.player.whatsapp_name}`).join(' ')
        return `🏆 *PRIORITY INVITES - ${gameDate}*

${priorityMentions}

You've been selected for priority registration! ⚽

Please confirm your attendance by ${formatTime(game.priority_deadline)} (Thursday 12pm).

Reply with:
✅ IN - I'm playing
❌ OUT - Can't make it

Game Details:
📅 ${gameDate}
⏰ ${gameTime}
📍 ${GAME_CONFIG.LOCATION}
💰 $${GAME_CONFIG.PAYMENT_AMOUNT}

If you decline or don't respond by the deadline, your spot opens to the waitlist.

See you on the pitch! ⚽🔥`

      case 'spots_available':
        const confirmedPlayers = players.filter(p =>
          CONFIRMED_STATUSES.includes(p.status as typeof CONFIRMED_STATUSES[number]) &&
          (p.payment_status === 'pending' || p.payment_status === 'marked_paid' || p.payment_status === 'verified')
        )
        const availableCount = 16 - confirmedPlayers.length
        return `⚡ *SPOTS AVAILABLE NOW - ${gameDate}*

🎉 ${availableCount} spot(s) just opened up!

First come, first served! Click the link to join:
👉 https://dropin-fc.app/dashboard

Game Details:
📅 ${gameDate}
⏰ ${gameTime}
📍 ${GAME_CONFIG.LOCATION}
💰 $${GAME_CONFIG.PAYMENT_AMOUNT}

Payment due by ${formatTime(game.payment_deadline)} (Saturday 11:59pm)

Spots fill up FAST - don't wait! ⚽🔥`

      case 'spot_reopened':
        return `🔓 *SPOT REOPENED - ${gameDate}*

1 spot just became available due to non-payment!

First come, first served! Click to join NOW:
👉 https://dropin-fc.app/dashboard

Game Details:
📅 ${gameDate}
⏰ ${gameTime}
📍 ${GAME_CONFIG.LOCATION}
💰 $${GAME_CONFIG.PAYMENT_AMOUNT}

Payment due by ${formatTime(game.payment_deadline)} (Saturday 11:59pm)

Don't miss out! ⚽`

      case 'payment_reminder':
        const unpaidMentions = unpaidPlayers.map((p) => `@${p.player.whatsapp_name}`).join(' ')
        return `💰 *PAYMENT REMINDER - ${gameDate}*

${unpaidMentions}

Friendly reminder: Payment deadline is ${formatTime(game.payment_deadline)} (Saturday 11:59pm)

Please send $${GAME_CONFIG.PAYMENT_AMOUNT} via e-transfer to [payment email]

If payment isn't received by the deadline, your spot will be given to the next player on the waitlist.

Thanks! ⚽`

      case 'teams':
        if (!game.teams_announced) {
          return 'Teams have not been announced yet.'
        }

        const darkKeeper = darkTeam.find(p => p.position === 'keeper' && p.is_starting)
        const darkField = darkTeam.filter(p => p.position === 'field' && p.is_starting)
        const darkSubs = darkTeam.filter(p => !p.is_starting)

        const lightKeeper = lightTeam.find(p => p.position === 'keeper' && p.is_starting)
        const lightField = lightTeam.filter(p => p.position === 'field' && p.is_starting)
        const lightSubs = lightTeam.filter(p => !p.is_starting)

        return `⚽ *TEAM LINEUPS - ${gameDate}*

📅 ${gameDate}
⏰ ${gameTime}
📍 ${GAME_CONFIG.LOCATION}

*🖤 DARK TEAM*
🧤 Keeper: @${darkKeeper?.player.whatsapp_name || 'TBD'}
⚽ Field: ${darkField.map((p) => `@${p.player.whatsapp_name}`).join(', ')}
🔄 Subs: ${darkSubs.map((p) => `@${p.player.whatsapp_name}`).join(', ')}

*🤍 LIGHT TEAM*
🧤 Keeper: @${lightKeeper?.player.whatsapp_name || 'TBD'}
⚽ Field: ${lightField.map((p) => `@${p.player.whatsapp_name}`).join(', ')}
🔄 Subs: ${lightSubs.map((p) => `@${p.player.whatsapp_name}`).join(', ')}

Let's have a great game! 🔥⚽`

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

  const canGenerateMessage = () => {
    switch (messageType) {
      case 'priority':
        return priorityPlayers.length > 0
      case 'spots_available':
        const confirmedCount = players.filter(p =>
          CONFIRMED_STATUSES.includes(p.status as typeof CONFIRMED_STATUSES[number]) &&
          (p.payment_status === 'pending' || p.payment_status === 'marked_paid' || p.payment_status === 'verified')
        ).length
        return confirmedCount < 16 // Can generate if spots are available
      case 'spot_reopened':
        return true // Always available as a template
      case 'payment_reminder':
        return unpaidPlayers.length > 0
      case 'teams':
        return game.teams_announced && darkTeam.length > 0 && lightTeam.length > 0
      default:
        return false
    }
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
              <SelectItem value="spot_reopened">
                Spot Reopened (after non-payment)
              </SelectItem>
              <SelectItem value="payment_reminder">
                Payment Reminder ({unpaidPlayers.length} unpaid)
              </SelectItem>
              <SelectItem value="teams">Team Announcement</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Generated Message */}
      {canGenerateMessage() ? (
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
      ) : (
        <Alert>
          <MessageSquare className="h-4 w-4" />
          <AlertDescription>
            {messageType === 'priority' && 'No priority players invited yet.'}
            {messageType === 'spots_available' && 'Game is full (16/16 players)!'}
            {messageType === 'spot_reopened' && 'Template available - use after removing non-payers.'}
            {messageType === 'payment_reminder' && 'All players have paid!'}
            {messageType === 'teams' && 'Teams have not been announced yet.'}
          </AlertDescription>
        </Alert>
      )}

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
