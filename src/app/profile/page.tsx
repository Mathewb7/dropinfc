'use client'

import { useState, useEffect } from 'react'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Loader2, Save, DollarSign, HandCoins, Camera } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { CreditTransaction } from '@/types/database'
import { useToast } from '@/hooks/use-toast'
import { uploadProfilePicture } from '@/lib/uploadProfilePicture'
import Image from 'next/image'

export default function ProfilePage() {
  const { user, loading: authLoading } = useRequireAuth()
  const { profile, refreshProfile } = useAuth()
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [whatsappName, setWhatsappName] = useState('')
  const [isPermanentKeeper, setIsPermanentKeeper] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(true)
  const [showWithdrawalDialog, setShowWithdrawalDialog] = useState(false)
  const [withdrawalReason, setWithdrawalReason] = useState('')
  const [withdrawalLoading, setWithdrawalLoading] = useState(false)
  const [withdrawalError, setWithdrawalError] = useState<string | null>(null)
  const [withdrawalSuccess, setWithdrawalSuccess] = useState(false)

  const supabase = createClient()

  // Load profile into form when editing starts
  const handleStartEdit = () => {
    if (profile) {
      setDisplayName(profile.display_name || '')
      setWhatsappName(profile.whatsapp_name || '')
      setIsPermanentKeeper(profile.is_permanent_keeper)
      setEditing(true)
    }
  }

  // Handle profile picture upload
  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setUploadingImage(true)
    setError(null)

    // Show preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    try {
      const { url, error: uploadError } = await uploadProfilePicture(file, user.id)

      if (uploadError) {
        setError(uploadError)
        setImagePreview(null)
        return
      }

      // Update profile with new picture URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_picture_url: url })
        .eq('id', user.id)

      if (updateError) throw updateError

      await refreshProfile()
      toast({
        title: "Profile Picture Updated",
        description: "Your profile picture has been updated successfully.",
      })
      setImagePreview(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload profile picture')
      setImagePreview(null)
    } finally {
      setUploadingImage(false)
    }
  }

  // Save profile changes
  const handleSave = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          whatsapp_name: whatsappName.trim() || displayName.trim(),
          is_permanent_keeper: isPermanentKeeper,
        })
        .eq('id', user?.id)

      if (updateError) throw updateError

      await refreshProfile()
      setSuccess(true)
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      })
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  // Fetch credit transactions
  const fetchTransactions = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('player_id', user.id)
        .order('created_at', { ascending: false })

      // Ignore errors - new users have no transactions
      setTransactions(data || [])
    } catch (err) {
      // Silently handle - it's okay if new users have no transactions
      setTransactions([])
    } finally {
      setTransactionsLoading(false)
    }
  }

  // Request credit balance withdrawal
  const handleRequestWithdrawal = async () => {
    if (!user || !profile) return

    // Check if they have any credit to withdraw
    if (profile.credit_balance <= 0) {
      setWithdrawalError('You have no credit balance to withdraw')
      return
    }

    setWithdrawalLoading(true)
    setWithdrawalError(null)
    setWithdrawalSuccess(false)

    try {
      // Create refund request (game_id is NULL for credit balance withdrawals)
      const { error: requestError } = await supabase
        .from('refund_requests')
        .insert({
          player_id: user.id,
          game_id: null, // NULL indicates credit balance withdrawal
          amount: profile.credit_balance,
          reason: withdrawalReason.trim() || 'Credit balance withdrawal request',
          status: 'pending',
        })

      if (requestError) throw requestError

      setWithdrawalSuccess(true)
      toast({
        title: "Withdrawal Requested",
        description: `Your withdrawal request for ${formatCurrency(profile.credit_balance)} has been submitted. An admin will review it soon.`,
      })
      setShowWithdrawalDialog(false)
      setWithdrawalReason('')
    } catch (err) {
      setWithdrawalError(err instanceof Error ? err.message : 'Failed to submit withdrawal request')
    } finally {
      setWithdrawalLoading(false)
    }
  }

  // Load transactions on mount
  useEffect(() => {
    fetchTransactions()
  }, [user])

  if (authLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Profile</h1>

        {/* Profile Information */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Your Information</CardTitle>
                <CardDescription>Manage your profile details</CardDescription>
              </div>
              {!editing && (
                <Button onClick={handleStartEdit}>Edit</Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Profile Picture */}
            <div className="flex flex-col items-center gap-4 pb-4 border-b">
              <div className="relative">
                {imagePreview || profile?.profile_picture_url ? (
                  <Image
                    src={imagePreview || profile?.profile_picture_url || ''}
                    alt="Profile"
                    width={120}
                    height={120}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-[120px] h-[120px] rounded-full bg-gray-200 flex items-center justify-center">
                    <Camera className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                {uploadingImage && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                )}
              </div>
              <div>
                <input
                  type="file"
                  id="profile-picture"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={handleProfilePictureChange}
                  disabled={uploadingImage}
                />
                <Label htmlFor="profile-picture">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingImage}
                    onClick={() => document.getElementById('profile-picture')?.click()}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {profile?.profile_picture_url ? 'Change Picture' : 'Upload Picture'}
                  </Button>
                </Label>
                <p className="text-xs text-gray-500 mt-1 text-center">
                  JPG, PNG or WebP (max 5MB)
                </p>
              </div>
            </div>

            {editing ? (
              <>
                <div>
                  <Label htmlFor="display-name">Display Name</Label>
                  <Input
                    id="display-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="whatsapp-name">WhatsApp Name</Label>
                  <Input
                    id="whatsapp-name"
                    value={whatsappName}
                    onChange={(e) => setWhatsappName(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Used for @mentions in WhatsApp group messages
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="keeper"
                    checked={isPermanentKeeper}
                    onCheckedChange={(checked) => setIsPermanentKeeper(checked as boolean)}
                  />
                  <Label htmlFor="keeper" className="font-normal cursor-pointer">
                    I prefer to play as goalkeeper
                  </Label>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert>
                    <AlertDescription>Profile updated successfully!</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <dl className="grid grid-cols-1 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900">{profile.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Display Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{profile.display_name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">WhatsApp Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{profile.whatsapp_name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Goalkeeper Preference</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {profile.is_permanent_keeper ? 'Yes' : 'No'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Role</dt>
                  <dd className="mt-1">
                    <Badge>{profile.role.replace('_', ' ').toUpperCase()}</Badge>
                  </dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>

        {/* Credit Balance - Only show if balance > 0 */}
        {profile.credit_balance > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Credit Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-bold text-green-600">
              {formatCurrency(profile.credit_balance)}
            </div>
            <p className="text-sm text-gray-600">
              Credits are automatically applied to your next game payment
            </p>

            {withdrawalSuccess && (
              <Alert>
                <AlertDescription>
                  Withdrawal request submitted! An admin will process it shortly.
                </AlertDescription>
              </Alert>
            )}

            {withdrawalError && (
              <Alert variant="destructive">
                <AlertDescription>{withdrawalError}</AlertDescription>
              </Alert>
            )}

            {profile.credit_balance > 0 && (
              <Button
                onClick={() => setShowWithdrawalDialog(true)}
                variant="outline"
                className="w-full"
              >
                <HandCoins className="h-4 w-4 mr-2" />
                Request Withdrawal
              </Button>
            )}
          </CardContent>
        </Card>
        )}

        {/* Transaction History - Only show if transactions exist */}
        {transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>Your credit transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : transactions.length > 0 ? (
              <div className="space-y-2">
                {transactions.map(t => (
                  <div key={t.id} className="flex justify-between items-center py-3 border-b last:border-0">
                    <div>
                      <div className="font-medium">
                        {t.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                      {t.notes && (
                        <div className="text-sm text-gray-500">{t.notes}</div>
                      )}
                      <div className="text-xs text-gray-400">
                        {new Date(t.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className={`text-lg font-semibold ${t.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {t.amount > 0 ? '+' : ''}{formatCurrency(t.amount)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">No transactions yet</p>
            )}
          </CardContent>
        </Card>
        )}

        {/* Withdrawal Request Dialog */}
        <AlertDialog open={showWithdrawalDialog} onOpenChange={setShowWithdrawalDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Request Credit Withdrawal</AlertDialogTitle>
              <AlertDialogDescription>
                Request to withdraw {formatCurrency(profile.credit_balance)} from your credit balance.
                An admin will process your request and send the payment.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-2">
              <Label htmlFor="withdrawal-reason">Reason (Optional)</Label>
              <Textarea
                id="withdrawal-reason"
                placeholder="Add a note for the admin..."
                value={withdrawalReason}
                onChange={(e) => setWithdrawalReason(e.target.value)}
                rows={3}
              />
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={withdrawalLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRequestWithdrawal} disabled={withdrawalLoading}>
                {withdrawalLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
