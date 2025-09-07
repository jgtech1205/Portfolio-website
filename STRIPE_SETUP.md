# Stripe Setup Guide for Chef en Place

This guide will help you set up Stripe for your Chef en Place application, including webhooks, pricing, and production configuration.

## 🚀 Quick Setup Checklist

- [ ] Create Stripe account
- [ ] Get API keys
- [ ] Create products and prices
- [ ] Set up webhook endpoint
- [ ] Configure environment variables
- [ ] Test webhook functionality

## 📋 Step-by-Step Setup

### 1. Create Stripe Account

1. Go to [stripe.com](https://stripe.com) and create an account
2. Complete your business verification
3. Switch between test and live modes as needed

### 2. Get Your API Keys

1. Go to **Developers > API keys** in your Stripe Dashboard
2. Copy your **Secret key** (starts with `sk_test_` or `sk_live_`)
3. Copy your **Publishable key** (starts with `pk_test_` or `pk_live_`)

### 3. Create Products and Prices

#### Create Pro Plan
1. Go to **Products** in your Stripe Dashboard
2. Click **Add product**
3. Name: "Chef en Place Pro"
4. Description: "Professional kitchen management with 200 recipes and 50 team members"
5. Create two prices:
   - **Monthly**: $49/month
   - **Yearly**: $490/year (2 months free)

#### Create Enterprise Plan
1. Create another product named "Chef en Place Enterprise"
2. Description: "Enterprise kitchen management with unlimited recipes and team members"
3. Create two prices:
   - **Monthly**: $99/month
   - **Yearly**: $990/year (2 months free)

### 4. Set Up Webhook Endpoint

1. Go to **Developers > Webhooks** in your Stripe Dashboard
2. Click **Add endpoint**
3. **Endpoint URL**: `https://chef-app-be.vercel.app/api/stripe/webhook`
4. **Events to send**:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)

### 5. Configure Environment Variables

Add these to your `.env` file and Vercel environment:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Stripe Price IDs (replace with your actual price IDs)
STRIPE_PRO_MONTHLY_PRICE_ID=price_your_pro_monthly_price_id
STRIPE_PRO_YEARLY_PRICE_ID=price_your_pro_yearly_price_id
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_your_enterprise_monthly_price_id
STRIPE_ENTERPRISE_YEARLY_PRICE_ID=price_your_enterprise_yearly_price_id

# Frontend URL
FRONTEND_URL=https://chef-frontend-psi.vercel.app
```

### 6. Test Your Webhook

Use the provided test tools:

```bash
# Test webhook locally
node test-cors.js

# Or use the browser test page
# Open cors-test.html in your browser
```

## 🔧 Webhook Event Handling

Your webhook currently handles these events:

### `checkout.session.completed`
- Creates head chef user account
- Creates restaurant record
- Links Stripe customer and subscription IDs
- Sets up user permissions

### `invoice.payment_succeeded`
- Updates restaurant subscription status to "active"
- Handles recurring payments

### `invoice.payment_failed`
- Updates restaurant subscription status to "past_due"
- Triggers payment failure handling

## 🧪 Testing

### Test Mode
- Use test API keys (`sk_test_...`)
- Use test webhook endpoint
- Use test price IDs
- Test with Stripe's test card numbers

### Live Mode
- Use live API keys (`sk_live_...`)
- Use live webhook endpoint
- Use live price IDs
- Real payments will be processed

## 🔒 Security Considerations

1. **Never commit API keys** to version control
2. **Use environment variables** for all sensitive data
3. **Verify webhook signatures** (already implemented)
4. **Handle webhook idempotency** (already implemented)
5. **Monitor webhook failures** in Stripe Dashboard

## 📊 Monitoring

### Stripe Dashboard
- Monitor webhook delivery in **Developers > Webhooks**
- Check payment status in **Payments**
- Review subscription status in **Subscriptions**

### Application Logs
- Webhook processing logs in your application
- Error handling and debugging information
- User and restaurant creation confirmations

## 🚨 Troubleshooting

### Common Issues

1. **Webhook signature verification failed**
   - Check `STRIPE_WEBHOOK_SECRET` is correct
   - Ensure webhook URL is accessible
   - Verify CORS configuration

2. **Price ID not found**
   - Check price IDs in environment variables
   - Ensure prices exist in Stripe Dashboard
   - Verify test/live mode consistency

3. **User creation fails**
   - Check database connection
   - Verify email uniqueness
   - Review user model validation

### Debug Commands

```bash
# Test webhook endpoint
curl -X POST https://chef-app-backend-rho.vercel.app/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: test" \
  -d '{"type":"test"}'

# Check environment variables
echo $STRIPE_SECRET_KEY
echo $STRIPE_WEBHOOK_SECRET
```

## 📈 Production Checklist

Before going live:

- [ ] Switch to live API keys
- [ ] Update webhook endpoint to production URL
- [ ] Test with real payment methods
- [ ] Set up monitoring and alerts
- [ ] Configure error handling
- [ ] Test subscription lifecycle
- [ ] Verify webhook reliability

## 🆘 Support

If you encounter issues:

1. Check Stripe Dashboard for webhook delivery status
2. Review application logs for error details
3. Test with Stripe's webhook testing tools
4. Verify environment variable configuration
5. Check CORS and network connectivity

Your webhook implementation is well-structured and ready for production once you complete the Stripe configuration steps above!
