/**
 * Subscriptions API Routes
 */

import type { Env, AuthenticatedRequest, FirebaseUser } from '../types';
import { jsonResponse, errorResponse, parseBody, generateSubscriptionCode, now, calculateEndDate } from '../utils/helpers';
import { getUserId } from '../utils/auth';

interface SubscriptionCode {
  code: string;
  months: number;
  plan_id: string;
  used: number;
  used_by: string | null;
  expires_at: string | null;
}

interface Admin {
  id: string;
  email: string;
  subscription_end: string | null;
  subscription_code: string | null;
  code_history: string | null;
  is_trial: number;
  trial_used: number;
}

export async function handleSubscriptions(
  request: AuthenticatedRequest,
  env: Env,
  path: string
): Promise<Response> {
  const method = request.method;
  const userId = getUserId(request);
  const user = request.user;

  if (!userId || !user) {
    return errorResponse('Unauthorized', 401);
  }

  if (method === 'POST' && path === '/api/subscriptions/verify') {
    const body = await parseBody<{ code: string }>(request);
    return verifyCode(env, userId, body, user);
  }

  if (method === 'POST' && path === '/api/subscriptions/trial') {
    return startTrial(env, userId, user);
  }

  if (method === 'GET' && path === '/api/subscriptions/status') {
    return getSubscriptionStatus(env, userId);
  }

  if (method === 'POST' && path === '/api/subscriptions/renew') {
    const body = await parseBody<{ code: string }>(request);
    return renewSubscription(env, userId, body, user);
  }

  if (method === 'POST' && path === '/api/subscriptions/codes') {
    const body = await parseBody<{ months: number; planId?: string; expiresAt?: string }>(request);
    return generateCode(env, body);
  }

  if (method === 'GET' && path === '/api/subscriptions/codes') {
    return getAllCodes(env);
  }

  return errorResponse('Not Found', 404);
}


async function verifyCode(
  env: Env,
  userId: string,
  data: { code: string },
  user: FirebaseUser
): Promise<Response> {
  try {
    const { code } = data;

    if (!code) {
      return errorResponse('Code is required', 400);
    }

    const formattedCode = code.toUpperCase().trim();

    const codeDoc = await env.DB.prepare(`
      SELECT * FROM subscription_codes WHERE code = ?
    `).bind(formattedCode).first<SubscriptionCode>();

    if (!codeDoc) {
      return errorResponse('Invalid subscription code', 400);
    }

    if (codeDoc.used) {
      if (codeDoc.used_by === userId) {
        const admin = await env.DB.prepare(`
          SELECT subscription_end FROM admins WHERE id = ?
        `).bind(userId).first<{ subscription_end: string | null }>();

        if (admin?.subscription_end && new Date(admin.subscription_end) > new Date()) {
          return jsonResponse({ 
            success: true, 
            message: 'Subscription is still active',
            alreadyActive: true 
          });
        }
        return errorResponse('Subscription expired, please renew', 400);
      }
      return errorResponse('Code already used by another account', 400);
    }

    if (codeDoc.expires_at && new Date(codeDoc.expires_at) < new Date()) {
      return errorResponse('Code has expired', 400);
    }

    const timestamp = now();
    const endDate = calculateEndDate(codeDoc.months || 12);
    const planId = codeDoc.plan_id || (codeDoc.months === 1 ? 'monthly' : codeDoc.months <= 6 ? 'semiAnnual' : 'annual');

    const existingAdmin = await env.DB.prepare(`
      SELECT id FROM admins WHERE id = ?
    `).bind(userId).first<{ id: string }>();

    if (existingAdmin) {
      await env.DB.prepare(`
        UPDATE admins SET 
          subscription_code = ?,
          subscription_start = ?,
          subscription_end = ?,
          subscription_months = ?,
          plan_id = ?,
          is_trial = 0,
          last_login = ?,
          updated_at = ?
        WHERE id = ?
      `).bind(formattedCode, timestamp, endDate, codeDoc.months || 12, planId, timestamp, timestamp, userId).run();
    } else {
      await env.DB.prepare(`
        INSERT INTO admins (id, email, subscription_code, subscription_start, subscription_end, subscription_months, plan_id, is_trial, last_login, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
      `).bind(userId, user.email, formattedCode, timestamp, endDate, codeDoc.months || 12, planId, timestamp, timestamp, timestamp).run();
    }

    await env.DB.prepare(`
      UPDATE subscription_codes SET used = 1, used_by = ?, used_by_email = ?, used_at = ?
      WHERE code = ?
    `).bind(userId, user.email, timestamp, formattedCode).run();

    return jsonResponse({
      success: true,
      subscriptionEnd: endDate,
      planId,
      months: codeDoc.months || 12
    });
  } catch (error) {
    console.error('Error verifying code:', error);
    return errorResponse('Error verifying code', 500);
  }
}


async function startTrial(env: Env, userId: string, user: FirebaseUser): Promise<Response> {
  try {
    const timestamp = now();
    
    const existingAdmin = await env.DB.prepare(`
      SELECT id, email, is_trial, subscription_end, trial_used FROM admins WHERE id = ?
    `).bind(userId).first<Admin>();

    const existingByEmail = await env.DB.prepare(`
      SELECT id, email, is_trial, subscription_end, trial_used FROM admins WHERE email = ?
    `).bind(user.email).first<Admin>();

    const existing = existingAdmin || existingByEmail;

    if (existing?.trial_used === 1) {
      return errorResponse('لقد استخدمت الفترة التجريبية من قبل. يرجى إدخال كود اشتراك للمتابعة.', 400);
    }

    if (existing?.subscription_end) {
      const endDate = new Date(existing.subscription_end);
      if (endDate > new Date()) {
        return errorResponse('لديك اشتراك نشط بالفعل', 400);
      }
    }

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);
    const endDate = trialEnd.toISOString();

    if (existingAdmin) {
      await env.DB.prepare(`
        UPDATE admins SET 
          subscription_start = ?,
          subscription_end = ?,
          subscription_months = 0,
          plan_id = 'trial',
          is_trial = 1,
          trial_used = 1,
          last_login = ?,
          updated_at = ?
        WHERE id = ?
      `).bind(timestamp, endDate, timestamp, timestamp, userId).run();
    } else if (existingByEmail) {
      await env.DB.prepare(`
        UPDATE admins SET 
          id = ?,
          subscription_start = ?,
          subscription_end = ?,
          subscription_months = 0,
          plan_id = 'trial',
          is_trial = 1,
          trial_used = 1,
          last_login = ?,
          updated_at = ?
        WHERE email = ?
      `).bind(userId, timestamp, endDate, timestamp, timestamp, user.email).run();
    } else {
      await env.DB.prepare(`
        INSERT INTO admins (id, email, subscription_start, subscription_end, subscription_months, plan_id, is_trial, trial_used, last_login, created_at, updated_at)
        VALUES (?, ?, ?, ?, 0, 'trial', 1, 1, ?, ?, ?)
      `).bind(userId, user.email, timestamp, endDate, timestamp, timestamp, timestamp).run();
    }

    return jsonResponse({
      success: true,
      subscriptionEnd: endDate,
      planId: 'trial',
      isTrial: true
    });
  } catch (error) {
    console.error('Error starting trial:', error);
    return errorResponse('Error starting trial', 500);
  }
}

async function getSubscriptionStatus(env: Env, userId: string): Promise<Response> {
  try {
    const admin = await env.DB.prepare(`
      SELECT subscription_end, subscription_months, plan_id, is_trial
      FROM admins WHERE id = ?
    `).bind(userId).first<{
      subscription_end: string | null;
      subscription_months: number;
      plan_id: string | null;
      is_trial: number;
    }>();

    if (!admin) {
      return jsonResponse({
        hasSubscription: false,
        isExpired: true
      });
    }

    const isExpired = !admin.subscription_end || new Date(admin.subscription_end) < new Date();
    const daysRemaining = admin.subscription_end 
      ? Math.max(0, Math.ceil((new Date(admin.subscription_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    return jsonResponse({
      hasSubscription: true,
      subscriptionEnd: admin.subscription_end,
      subscriptionMonths: admin.subscription_months,
      planId: admin.plan_id,
      isTrial: admin.is_trial === 1,
      isExpired,
      daysRemaining
    });
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return errorResponse('Error getting subscription status', 500);
  }
}


async function renewSubscription(
  env: Env,
  userId: string,
  data: { code: string },
  user: FirebaseUser
): Promise<Response> {
  try {
    const { code } = data;

    if (!code) {
      return errorResponse('Code is required', 400);
    }

    const formattedCode = code.toUpperCase().trim();

    const codeDoc = await env.DB.prepare(`
      SELECT * FROM subscription_codes WHERE code = ?
    `).bind(formattedCode).first<SubscriptionCode>();

    if (!codeDoc) {
      return errorResponse('Invalid subscription code', 400);
    }

    if (codeDoc.used) {
      return errorResponse('Code already used', 400);
    }

    const admin = await env.DB.prepare(`
      SELECT subscription_end, code_history FROM admins WHERE id = ?
    `).bind(userId).first<{ subscription_end: string | null; code_history: string | null }>();

    const currentEnd = admin?.subscription_end && new Date(admin.subscription_end) > new Date()
      ? new Date(admin.subscription_end)
      : new Date();
    
    currentEnd.setMonth(currentEnd.getMonth() + (codeDoc.months || 12));
    const newEndDate = currentEnd.toISOString();
    const timestamp = now();
    const planId = codeDoc.plan_id || (codeDoc.months === 1 ? 'monthly' : codeDoc.months <= 6 ? 'semiAnnual' : 'annual');

    const codeHistory = admin?.code_history ? JSON.parse(admin.code_history) : [];
    codeHistory.push({
      code: formattedCode,
      planId,
      months: codeDoc.months || 12,
      usedAt: timestamp,
      endDate: newEndDate
    });

    await env.DB.prepare(`
      UPDATE admins SET 
        subscription_code = ?,
        subscription_end = ?,
        subscription_months = ?,
        plan_id = ?,
        is_trial = 0,
        code_history = ?,
        updated_at = ?
      WHERE id = ?
    `).bind(formattedCode, newEndDate, codeDoc.months || 12, planId, JSON.stringify(codeHistory), timestamp, userId).run();

    await env.DB.prepare(`
      UPDATE subscription_codes SET used = 1, used_by = ?, used_by_email = ?, used_at = ?
      WHERE code = ?
    `).bind(userId, user.email, timestamp, formattedCode).run();

    return jsonResponse({
      success: true,
      subscriptionEnd: newEndDate,
      planId,
      months: codeDoc.months || 12
    });
  } catch (error) {
    console.error('Error renewing subscription:', error);
    return errorResponse('Error renewing subscription', 500);
  }
}

async function generateCode(
  env: Env,
  data: { months: number; planId?: string; expiresAt?: string }
): Promise<Response> {
  try {
    const { months, planId, expiresAt } = data;

    if (!months && months !== 0) {
      return errorResponse('Months is required', 400);
    }

    const code = generateSubscriptionCode();
    const timestamp = now();
    const finalPlanId = planId || (months === 0 ? 'trial' : months === 1 ? 'monthly' : months <= 6 ? 'semiAnnual' : 'annual');

    await env.DB.prepare(`
      INSERT INTO subscription_codes (code, months, plan_id, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(code, months, finalPlanId, expiresAt || null, timestamp).run();

    return jsonResponse({
      success: true,
      code,
      months,
      planId: finalPlanId
    }, 201);
  } catch (error) {
    console.error('Error generating code:', error);
    return errorResponse('Error generating code', 500);
  }
}

async function getAllCodes(env: Env): Promise<Response> {
  try {
    const codes = await env.DB.prepare(`
      SELECT * FROM subscription_codes ORDER BY created_at DESC
    `).all();

    return jsonResponse(codes.results);
  } catch (error) {
    console.error('Error fetching codes:', error);
    return errorResponse('Error fetching codes', 500);
  }
}
