export const auth0Config = {
  domain: "ai-chef.uk.auth0.com",
  clientId: "DfhUSQA63AazZKDZz5IqXXPCfHanDwGC",
  redirectUri: window.location.origin,
  // redirectUri: `${window.location.origin}/cookbook?saved=true`,
  audience: "https://ai-chef-api",  // This will be used as the API identifier
  scope: "openid profile email"
}; 