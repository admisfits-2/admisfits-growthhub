# Meta Ads Integration Guide

## Overview
This guide explains how to set up and use the Meta Ads (Facebook Ads) integration to fetch ad spend, impressions, clicks, conversions, and other marketing metrics directly into your AdmisFits dashboard.

## Requirements

### 1. Meta Business Account
- You need a Meta Business account with access to the ad accounts you want to track
- Admin or Advertiser role on the ad accounts

### 2. Meta App Setup
1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a new app or use an existing one
3. Add the "Marketing API" product to your app
4. Generate an access token with the following permissions:
   - `ads_read` - Read ads data
   - `ads_management` - Manage ads (optional, for future features)
   - `business_management` - Access business data
   - `read_insights` - Read analytics data

### 3. Required Credentials
You'll need:
- **App ID**: Your Meta app ID
- **App Secret**: Your Meta app secret
- **Access Token**: User or system access token
- **Ad Account ID**: The ID of your ad account (format: act_XXXXXXXXX)

## Environment Setup

Add these variables to your `.env` file:

```bash
# Meta Ads Configuration
VITE_META_APP_ID=your_app_id_here
VITE_META_APP_SECRET=your_app_secret_here
VITE_META_ACCESS_TOKEN=your_access_token_here
VITE_META_AD_ACCOUNT_ID=act_your_account_id_here
VITE_META_REDIRECT_URI=http://localhost:5173/auth/meta/callback
```

## Available Metrics

The integration fetches the following metrics:

### Campaign Metrics
- **Impressions**: Number of times ads were shown
- **Reach**: Unique people who saw ads
- **Frequency**: Average times each person saw ads

### Engagement Metrics
- **Clicks**: Total clicks on ads
- **CTR (Click-Through Rate)**: Clicks / Impressions
- **CPC (Cost Per Click)**: Spend / Clicks

### Conversion Metrics
- **Conversions**: Total conversions (purchases, leads, etc.)
- **Conversion Rate**: Conversions / Clicks
- **CPA (Cost Per Acquisition)**: Spend / Conversions

### Financial Metrics
- **Spend**: Total ad spend
- **CPM (Cost Per Mille)**: Cost per 1000 impressions
- **ROAS (Return on Ad Spend)**: Revenue / Spend

## API Endpoints

### Marketing API Base URL
```
https://graph.facebook.com/v18.0/
```

### Key Endpoints
1. **Ad Account Insights**
   ```
   GET /{ad-account-id}/insights
   ```

2. **Campaign Insights**
   ```
   GET /{campaign-id}/insights
   ```

3. **Ad Set Insights**
   ```
   GET /{adset-id}/insights
   ```

## OAuth 2.0 Flow

1. **Authorization URL**:
   ```
   https://www.facebook.com/v18.0/dialog/oauth?
     client_id={app-id}
     &redirect_uri={redirect-uri}
     &scope=ads_read,read_insights,business_management
     &response_type=code
   ```

2. **Token Exchange**:
   ```
   POST https://graph.facebook.com/v18.0/oauth/access_token
   ```

3. **Long-Lived Token Exchange**:
   ```
   GET https://graph.facebook.com/v18.0/oauth/access_token?
     grant_type=fb_exchange_token
     &client_id={app-id}
     &client_secret={app-secret}
     &fb_exchange_token={short-lived-token}
   ```

## Rate Limits

Meta API has the following rate limits:
- **Business Use Case**: 200 calls per hour per ad account
- **Standard Access**: Lower limits, upgrade to Advanced Access for production
- **Batch Requests**: Up to 50 requests in a single batch

## Best Practices

1. **Use Field Filtering**: Only request fields you need to reduce response size
2. **Implement Caching**: Cache responses to minimize API calls
3. **Use Batch Requests**: Combine multiple requests when possible
4. **Handle Errors Gracefully**: Implement retry logic for rate limits
5. **Store Tokens Securely**: Never expose access tokens in client-side code

## Testing

Use the [Graph API Explorer](https://developers.facebook.com/tools/explorer/) to test your queries before implementing them.

## Support

For Meta API issues:
- [Meta Business Help Center](https://www.facebook.com/business/help)
- [Marketing API Documentation](https://developers.facebook.com/docs/marketing-apis)