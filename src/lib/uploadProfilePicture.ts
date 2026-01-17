import { createClient } from '@/lib/supabase/client'

export async function uploadProfilePicture(file: File, userId: string): Promise<{ url: string | null; error: string | null }> {
  const supabase = createClient()

  // Validate file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!validTypes.includes(file.type)) {
    return { url: null, error: 'Please upload a valid image file (JPG, PNG, or WebP)' }
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    return { url: null, error: 'Image must be less than 5MB' }
  }

  try {
    // Delete old profile picture if exists
    const { data: existingFiles } = await supabase.storage
      .from('profile-pictures')
      .list(userId)

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map(f => `${userId}/${f.name}`)
      await supabase.storage
        .from('profile-pictures')
        .remove(filesToDelete)
    }

    // Upload new picture
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/profile.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('profile-pictures')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return { url: null, error: uploadError.message }
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(fileName)

    return { url: publicUrl, error: null }
  } catch (err) {
    console.error('Upload failed:', err)
    return { url: null, error: 'Failed to upload image' }
  }
}
