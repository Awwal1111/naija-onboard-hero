import { supabase } from '@/integrations/supabase/client'

export interface ChatContext {
  context: 'story' | 'gig' | 'expert' | 'job' | 'post' | 'profile'
  context_label: string
  story_id?: string
  story_content?: string
  gig_id?: string
  gig_title?: string
  expert_id?: string
  job_id?: string
  job_title?: string
  post_id?: string
}

interface InitiateChatParams {
  currentUserId: string
  targetUserId: string
  context: ChatContext
  autoMessage?: string
}

/**
 * Initiates a chat with context, sending an auto-message with origin information
 */
export async function initiateContextualChat({
  currentUserId,
  targetUserId,
  context,
  autoMessage
}: InitiateChatParams): Promise<{ success: boolean; error?: string }> {
  try {
    // Find or create chat
    const { data: existingChat } = await supabase
      .from('chats')
      .select('id')
      .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${targetUserId}),and(user1_id.eq.${targetUserId},user2_id.eq.${currentUserId})`)
      .maybeSingle()

    let chatId = existingChat?.id

    if (!chatId) {
      // Create new chat
      const { data: newChat, error } = await supabase
        .from('chats')
        .insert({
          user1_id: currentUserId,
          user2_id: targetUserId
        })
        .select()
        .single()

      if (error) throw error
      chatId = newChat.id
    }

    // Generate auto message based on context
    const message = autoMessage || getDefaultMessage(context)

    // Send auto message with context
    await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: currentUserId,
        content: message,
        payload: context
      })

    return { success: true }
  } catch (error) {
    console.error('Error initiating contextual chat:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to start conversation' 
    }
  }
}

function getDefaultMessage(context: ChatContext): string {
  switch (context.context) {
    case 'story':
      return `👋 Hi! I'm interested in connecting with you after seeing your story.`
    case 'gig':
      return `👋 Hi! I'm interested in your gig: "${context.gig_title || 'your service'}". Can we discuss?`
    case 'expert':
      return `👋 Hi! I saw your expert profile and I'm interested in working with you.`
    case 'job':
      return `👋 Hi! I'm reaching out about the job: "${context.job_title || 'your listing'}".`
    case 'post':
      return `👋 Hi! I saw your post and wanted to connect.`
    case 'profile':
      return `👋 Hi! I viewed your profile and wanted to reach out.`
    default:
      return `👋 Hi! I'd like to connect with you.`
  }
}

/**
 * Get context label for display
 */
export function getContextLabel(context: ChatContext['context']): string {
  switch (context) {
    case 'story': return 'From Story'
    case 'gig': return 'From Gig'
    case 'expert': return 'From Expert Profile'
    case 'job': return 'From Job Post'
    case 'post': return 'From Post'
    case 'profile': return 'From Profile'
    default: return 'Direct Message'
  }
}
