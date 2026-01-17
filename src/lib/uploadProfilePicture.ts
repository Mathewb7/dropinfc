import { createClient } from '@/lib/supabase/client'

export async function uploadProfilePicture(file: File, userId: string): Promise<{ url: string | null; error: string | null }> {
  const supabase = createClient()

  // Validate file type
  const extensionByType: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  }
  if (!extensionByType[file.type]) {
    return { url: null, error: 'Please upload a valid image file (JPG, PNG, or WebP)' }
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    return { url: null, error: 'Image must be less than 5MB' }
  }

  try {
    // Upload new picture
    const fileExt = extensionByType[file.type]
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

    // Clean up old profile pictures after a successful upload
    const { data: existingFiles } = await supabase.storage
      .from('profile-pictures')
      .list(userId)

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles
        .map(f => `${userId}/${f.name}`)
        .filter(path => path !== fileName)

      if (filesToDelete.length > 0) {
        await supabase.storage
          .from('profile-pictures')
          .remove(filesToDelete)
      }
    }

    // Get public URL with cache-busting parameter
    const { data: { publicUrl } } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(fileName)

    // Add timestamp to bust browser cache
    const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`

    return { url: urlWithCacheBust, error: null }
  } catch (err) {
    console.error('Upload failed:', err)
    return { url: null, error: 'Failed to upload image' }
  }
}
