import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Email addresses to send alerts to
const ALERT_EMAILS = [
  "8189431370@vtext.com",
  "8184008921@vtext.com"
];

// Days ahead to check for expiration
const DAYS_AHEAD = 3;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Allow both GET (for manual triggers) and POST (for scheduled triggers)
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("PROJECT_URL");
    const serviceKey = Deno.env.get("SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      console.error("Missing Supabase environment configuration");
      return jsonResponse({ error: "Server configuration error" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceKey, { 
      auth: { persistSession: false } 
    });

    // Get items expiring in the next 3 days
    const { data: expiringItems, error: queryError } = await supabase
      .rpc("get_items_expiring_soon", { days_ahead: DAYS_AHEAD });

    if (queryError) {
      console.error("Error querying expiring items:", queryError);
      return jsonResponse({ error: "Failed to query expiring items" }, 500);
    }

    if (!expiringItems || expiringItems.length === 0) {
      return jsonResponse({ 
        message: "No items expiring soon",
        count: 0 
      });
    }

    // Format the alert message
    const alertMessage = formatAlertMessage(expiringItems);

    // Send email alerts
    const emailResults = await sendEmailAlerts(alertMessage);

    return jsonResponse({
      message: "Expiration alerts processed",
      itemsCount: expiringItems.length,
      emailsSent: emailResults.filter(r => r.success).length,
      emailResults: emailResults
    });

  } catch (error) {
    console.error("expiration-alerts error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});

function formatAlertMessage(items: any[]): string {
  let message = `Items Expiring in the Next ${DAYS_AHEAD} Days:\n\n`;
  
  items.forEach((item, index) => {
    const daysUntil = getDaysUntilExpiration(item.expiration_date);
    const daysText = daysUntil === 0 ? "TODAY" : daysUntil === 1 ? "1 day" : `${daysUntil} days`;
    
    message += `${index + 1}. ${item.item_name}\n`;
    message += `   Store: ${item.store_name}\n`;
    message += `   Expires: ${formatDate(item.expiration_date)} (${daysText})\n`;
    message += `   Quantity: ${item.quantity}\n\n`;
  });

  return message;
}

function getDaysUntilExpiration(expirationDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiration = new Date(expirationDate);
  expiration.setHours(0, 0, 0, 0);
  const diffTime = expiration.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

async function sendEmailAlerts(message: string): Promise<Array<{ email: string; success: boolean; error?: string }>> {
  const results: Array<{ email: string; success: boolean; error?: string }> = [];

  // Note: This is a placeholder implementation
  // In production, you would integrate with an email service like:
  // - SendGrid
  // - AWS SES
  // - Resend
  // - Supabase Email (if available)
  
  // For now, we'll use a simple HTTP-based email service
  // You can replace this with your preferred email service
  
  const emailServiceUrl = Deno.env.get("EMAIL_SERVICE_URL");
  const emailApiKey = Deno.env.get("EMAIL_API_KEY");

  if (!emailServiceUrl || !emailApiKey) {
    console.warn("Email service not configured. Skipping email alerts.");
    // Return success for all emails but log the warning
    ALERT_EMAILS.forEach(email => {
      results.push({ email, success: false, error: "Email service not configured" });
    });
    return results;
  }

  // Send email to each recipient
  for (const email of ALERT_EMAILS) {
    try {
      const response = await fetch(emailServiceUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${emailApiKey}`
        },
        body: JSON.stringify({
          to: email,
          subject: `Shopping Alert: Items Expiring Soon`,
          text: message,
          html: message.replace(/\n/g, "<br>")
        })
      });

      if (response.ok) {
        results.push({ email, success: true });
      } else {
        const errorText = await response.text();
        results.push({ email, success: false, error: errorText });
      }
    } catch (error) {
      console.error(`Error sending email to ${email}:`, error);
      results.push({ 
        email, 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  }

  return results;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

