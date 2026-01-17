'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info, Camera, Loader2 } from 'lucide-react'
import { uploadProfilePicture } from '@/lib/uploadProfilePicture'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [whatsappName, setWhatsappName] = useState('')
  const [isPermanentKeeper, setIsPermanentKeeper] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [profilePicture, setProfilePicture] = useState<File | null>(null)
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null)
  const { signUp } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPG, PNG, or WebP)')
      return
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      setError('Image must be less than 5MB')
      return
    }

    setProfilePicture(file)

    // Show preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setProfilePicturePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    if (!displayName.trim()) {
      setError('Display name is required')
      setLoading(false)
      return
    }

    // Sign up with metadata
    const { data, error } = await signUp(email, password, {
      display_name: displayName.trim(),
      whatsapp_name: whatsappName.trim() || displayName.trim(), // Default to display name
      is_permanent_keeper: isPermanentKeeper,
    })

    if (error) {
      console.error('Signup error:', error)
      setError(error.message)
      setLoading(false)
      return
    }

    // Upload profile picture if provided
    if (profilePicture && data?.user) {
      const { url, error: uploadError } = await uploadProfilePicture(profilePicture, data.user.id)

      if (!uploadError && url) {
        // Update profile with picture URL
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ profile_picture_url: url })
          .eq('id', data.user.id)

        if (profileError) {
          console.error('Profile picture update failed:', profileError)
        }
      }
    }

    setSuccess(true)
    setTimeout(() => {
      router.push('/login')
    }, 2000)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full space-y-8">
          <Alert>
            <AlertDescription>
              <h2 className="text-2xl font-bold mb-2">Success!</h2>
              <p>Please check your email to confirm your account.</p>
              <p className="mt-2">Redirecting to login...</p>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Join DropIn FC at Windsor Bubble
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Email */}
            <div>
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            {/* Display Name */}
            <div>
              <Label htmlFor="display-name">
                Display Name
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="display-name"
                name="display-name"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How you want to be called"
              />
              <p className="mt-1 text-xs text-gray-500">
                This is how other players will see you
              </p>
            </div>

            {/* WhatsApp Name */}
            <div>
              <Label htmlFor="whatsapp-name" className="flex items-center gap-2">
                WhatsApp Name
                <div className="group relative">
                  <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  <div className="invisible group-hover:visible absolute left-0 top-6 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                    Your name as it appears in WhatsApp. Used for @mentions in group messages. Leave blank if same as display name.
                  </div>
                </div>
              </Label>
              <Input
                id="whatsapp-name"
                name="whatsapp-name"
                type="text"
                value={whatsappName}
                onChange={(e) => setWhatsappName(e.target.value)}
                placeholder="Optional - for @mentions"
              />
            </div>

            {/* Profile Picture */}
            <div>
              <Label htmlFor="profile-picture">Profile Picture (Optional)</Label>
              <div className="mt-2 flex items-center gap-4">
                {profilePicturePreview ? (
                  <Image
                    src={profilePicturePreview}
                    alt="Profile preview"
                    width={80}
                    height={80}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                    <Camera className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    id="profile-picture"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    className="hidden"
                    onChange={handleProfilePictureChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('profile-picture')?.click()}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Choose Photo
                  </Button>
                  <p className="text-xs text-gray-500 mt-1">
                    JPG, PNG or WebP (max 5MB)
                  </p>
                </div>
              </div>
            </div>

            {/* Keeper Preference */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="keeper"
                checked={isPermanentKeeper}
                onCheckedChange={(checked) => setIsPermanentKeeper(checked as boolean)}
              />
              <Label
                htmlFor="keeper"
                className="text-sm font-normal cursor-pointer"
              >
                I prefer to play as goalkeeper
              </Label>
            </div>

            {/* Password */}
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                name="confirm-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
              />
            </div>

            {/* Show Password */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-password"
                checked={showPassword}
                onCheckedChange={(checked) => setShowPassword(checked as boolean)}
              />
              <Label
                htmlFor="show-password"
                className="text-sm font-normal cursor-pointer"
              >
                Show password
              </Label>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </Button>
          </div>

          <div className="text-center text-sm">
            <span className="text-gray-600">Already have an account? </span>
            <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
