import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';
import { Resend } from 'npm:resend@4.0.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const WORKER_ID = `digest-worker-${crypto.randomUUID()}`;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const resend = new Resend(RESEND_API_KEY ?? '');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
};

interface TaskRow {
  id: string;
  task_type: string;
  payload: { user_id: string; run_date: string };
  status: string;
  attempts: number;
}

async function fetchPendingTasks(limit = 10) {
  const { data, error } = await supabase
    .from('task_queue')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('[WORKER] Failed to fetch pending tasks:', error);
    return [];
  }

  return data as TaskRow[];
}

async function lockTasks(taskIds: string[]) {
  if (taskIds.length === 0) return [];

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('task_queue')
    .update({ status: 'processing', locked_at: now, locked_by: WORKER_ID, updated_at: now })
    .in('id', taskIds)
    .eq('status', 'pending')
    .select('*');

  if (error) {
    console.error('[WORKER] Failed to lock tasks:', error);
    return [];
  }

  return data as TaskRow[];
}

async function completeTask(taskId: string) {
  const now = new Date().toISOString();
  await supabase
    .from('task_queue')
    .update({ status: 'completed', updated_at: now })
    .eq('id', taskId);
}

async function failTask(taskId: string, errorMessage: string, attempts: number) {
  const now = new Date().toISOString();
  await supabase
    .from('task_queue')
    .update({
      status: attempts >= 3 ? 'failed' : 'pending',
      attempts,
      last_error: errorMessage,
      locked_at: null,
      locked_by: null,
      updated_at: now,
    })
    .eq('id', taskId);
}

function formatCurrency(value: number) {
  return value.toLocaleString('en-NG');
}

async function sendDigestEmail(userId: string, runDate: string) {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('user_id', userId)
    .single();

  if (profileError || !profile) {
    throw new Error(`Unable to load profile for user ${userId}`);
  }

  const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
  if (authError || !authUser?.user?.email) {
    throw new Error(`Unable to load email for user ${userId}`);
  }

  const email = authUser.user.email;

  const oneDayAgo = new Date(runDate);
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const [messagesRes, connectionsRes, viewsRes, transactionsRes, newJobsRes] = await Promise.all([
    supabase.from('messages').select('id', { count: 'exact', head: true }).neq('sender_id', userId).gte('created_at', oneDayAgo.toISOString()),
    supabase.from('connection_requests').select('id', { count: 'exact', head: true }).eq('requested_id', userId).gte('created_at', oneDayAgo.toISOString()),
    supabase.from('post_views').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('viewed_at', oneDayAgo.toISOString()),
    supabase.from('wallet_transactions').select('amount').eq('user_id', userId).eq('status', 'completed').gte('created_at', oneDayAgo.toISOString()),
    supabase.from('job_posts').select('title, budget').eq('status', 'open').gte('created_at', oneDayAgo.toISOString()).limit(5),
  ]);

  const newMessages = messagesRes.count || 0;
  const newConnections = connectionsRes.count || 0;
  const profileViews = viewsRes.count || 0;
  const earnings = (transactionsRes.data || []).filter((t: any) => t.amount > 0).reduce((sum: number, t: any) => sum + t.amount, 0);
  const hasNewJobs = (newJobsRes.data || []).length > 0;

  if (newMessages === 0 && newConnections === 0 && profileViews === 0 && earnings === 0 && !hasNewJobs) {
    return { skipped: true };
  }

  const firstName = profile.full_name?.split(' ')[0] || 'there';
  const baseUrl = 'https://naijalancers.name.ng';

  let activityHTML = '';
  if (newMessages > 0) activityHTML += `<tr><td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6;"><span style="font-size: 20px;">💬</span><strong style="color: #059669; margin-left: 8px;">${newMessages}</strong><span style="color: #374151; margin-left: 4px;">new message${newMessages > 1 ? 's' : ''}</span><a href="${baseUrl}/chats" style="float: right; color: #059669; text-decoration: none; font-weight: 600;">Reply →</a></td></tr>`;
  if (newConnections > 0) activityHTML += `<tr><td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6;"><span style="font-size: 20px;">🤝</span><strong style="color: #059669; margin-left: 8px;">${newConnections}</strong><span style="color: #374151; margin-left: 4px;">connection request${newConnections > 1 ? 's' : ''}</span><a href="${baseUrl}/connections" style="float: right; color: #059669; text-decoration: none; font-weight: 600;">View →</a></td></tr>`;
  if (profileViews > 0) activityHTML += `<tr><td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6;"><span style="font-size: 20px;">👀</span><strong style="color: #059669; margin-left: 8px;">${profileViews}</strong><span style="color: #374151; margin-left: 4px;">people viewed your profile</span></td></tr>`;
  if (earnings > 0) activityHTML += `<tr><td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6;"><span style="font-size: 20px;">💰</span><strong style="color: #059669; margin-left: 8px;">₦${formatCurrency(earnings)}</strong><span style="color: #374151; margin-left: 4px;">earned yesterday</span></td></tr>`;

  const jobsHTML = hasNewJobs
    ? `<div style="margin-top: 24px;"><h3 style="color: #111827; font-size: 16px; margin: 0 0 12px;">🆕 New Jobs for You</h3>${(newJobsRes.data || []).map((job: any) => `<div style="background: #f0fdf4; border-radius: 8px; padding: 12px 16px; margin-bottom: 8px;"><strong style="color: #111827;">${job.title}</strong><span style="color: #059669; float: right;">₦${job.budget?.toLocaleString() || 'Negotiable'}</span></div>`).join('')}<div style="text-align: center; margin-top: 12px;"><a href="${baseUrl}/jobs" style="color: #059669; text-decoration: none; font-weight: 600;">Browse all jobs →</a></div></div>`
    : '';

  const subject = newMessages > 0
    ? `💬 You have ${newMessages} unread message${newMessages > 1 ? 's' : ''} on NaijaLancers`
    : newConnections > 0
      ? `🤝 ${newConnections} people want to connect with you`
      : profileViews > 0
        ? `👀 ${profileViews} people viewed your profile this week`
        : hasNewJobs
          ? `🆕 ${Math.min(5, (newJobsRes.data || []).length)} new jobs matching your skills`
          : `📊 Your daily NaijaLancers update`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; margin: 0; padding: 20px;"><div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);"><div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 24px; text-align: center;"><h1 style="color: white; margin: 0; font-size: 20px;">📊 Your Daily Update</h1><p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">${new Date(runDate).toLocaleDateString('en-NG', { weekday: 'long', month: 'long', day: 'numeric' })}</p></div><div style="padding: 24px;"><p style="color: #374151; font-size: 16px; margin: 0 0 20px;">Hi ${firstName} 👋, here's what happened yesterday:</p>${activityHTML ? `<table style="width: 100%; border-collapse: collapse; background: #fafafa; border-radius: 8px; overflow: hidden;">${activityHTML}</table>` : `<div style="text-align: center; padding: 20px; background: #fafafa; border-radius: 8px;"><p style="color: #6b7280; margin: 0;">No new activity yesterday — but new opportunities are waiting!</p></div>`}${jobsHTML}<div style="text-align: center; margin-top: 28px;"><a href="${baseUrl}/dashboard" style="display: inline-block; background: #059669; color: white; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Open Dashboard</a></div></div><div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;"><p style="color: #9ca3af; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} NaijaLancers • <a href="${baseUrl}/settings" style="color: #9ca3af;">Manage preferences</a></p></div></div></body></html>`;

  const { error } = await resend.emails.send({
    from: 'NaijaLancers <notifications@naijalancers.name.ng>',
    to: [email],
    subject,
    html,
  });

  if (error) {
    throw new Error(`Resend error: ${JSON.stringify(error)}`);
  }

  return { skipped: false };
}

async function processTask(task: TaskRow) {
  try {
    if (task.task_type !== 'daily_email_digest') {
      throw new Error(`Unsupported task type: ${task.task_type}`);
    }

    const result = await sendDigestEmail(task.payload.user_id, task.payload.run_date);
    if (result.skipped) {
      await completeTask(task.id);
      console.log(`[WORKER] Skipped digest for ${task.payload.user_id}`);
      return;
    }

    await completeTask(task.id);
    console.log(`[WORKER] Completed digest for ${task.payload.user_id}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    const attempts = task.attempts + 1;
    await failTask(task.id, message, attempts);
    console.error(`[WORKER] Failed task ${task.id} attempt ${attempts}:`, message);
  }
}

async function runWorkerLoop() {
  console.log('[WORKER] Digest worker started', WORKER_ID);

  while (true) {
    const tasks = await fetchPendingTasks(10);
    if (tasks.length === 0) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      continue;
    }

    const lockedTasks = await lockTasks(tasks.map(task => task.id));
    for (const task of lockedTasks) {
      await processTask(task);
      await new Promise(resolve => setTimeout(resolve, 400));
    }
  }
}

await runWorkerLoop();
