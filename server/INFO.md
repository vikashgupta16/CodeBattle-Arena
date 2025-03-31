# Netlify functions
All Netlify functions are present in `./functions` folder
- The main entry point function in netlify is the `index.js` which hosts the actual express route and calls other functions or code from `./src`
- All requests to `/*` are redirected to `/.netlify/functions/index/*` to provide a seamless experience
- However as it turns out Netlify functions are limited to 10s of timeout and thus may fail
- Thus other functions must be implemented to handle different endpoints

# Secrets
All secrets must be defined in the .env file and not shared

# My thoughts
Netlify is too limited for the purpose we want to achieve
and it might simply fall short on demands
Limitations:
- The `10s functions timeout` and `28s background functions timeout` will prevent websockets from staying
- No access to a background container means no local code processing or compilation which has to be deferred to another backend service somewhere