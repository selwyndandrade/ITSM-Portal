# Registration Troubleshooting Guide

## Why Registration Might Fail

The most common reason for registration failure is **password requirements**. Your backend has strict security rules.

### Password Requirements

Your password MUST include ALL of these:

✅ **At least 6 characters**
✅ **At least 1 uppercase letter** (A-Z)
✅ **At least 1 lowercase letter** (a-z)
✅ **At least 1 number** (0-9)
✅ **At least 1 special character** (!@#$%^&*-_+=)

### Valid Password Examples

✅ `Test@123` - Contains: uppercase (T), lowercase (est), number (123), special (@)
✅ `MyPass1!` - Contains: uppercase (MP), lowercase (yass), number (1), special (!)
✅ `Admin@2024` - Contains: uppercase (A), lowercase (dmin), number (2024), special (@)
✅ `Hello#99` - Contains: uppercase (H), lowercase (ello), number (99), special (#)
✅ `Secure$1` - Contains: uppercase (S), lowercase (ecure), number (1), special ($)

### Invalid Password Examples (Will Fail)

❌ `test123` - No uppercase, no special character
❌ `TEST123` - No lowercase, no special character
❌ `TestTest` - No number, no special character
❌ `Test@` - No number, less than 6 characters
❌ `test@test` - No uppercase, no number
❌ `12345678` - No letters, no special character

## Testing Steps

### 1. Check if Backend is Running

Open PowerShell and run:
```powershell
cd C:\Users\selwy\source\repos\ITSM-Portal\ITSM.Portal.API
dotnet run
```

You should see:
```
Now listening on: https://localhost:7060
```

### 2. Check if Frontend is Running

Open a NEW PowerShell window and run:
```powershell
cd C:\Users\selwy\source\repos\ITSM-Portal\itsm-portal-client
npm run dev
```

You should see:
```
Local: http://localhost:5173/
```

### 3. Test Registration with a Valid Password

1. Open browser to `http://localhost:5173`
2. Click **"Register here"**
3. Fill in the form:
   - **Email:** `test@example.com`
   - **Password:** `Test@123`
   - **Confirm Password:** `Test@123`
4. Click **Register**

### 4. Check Browser Console for Errors

If registration still fails:

1. Press **F12** to open Developer Tools
2. Click the **Console** tab
3. Try to register again
4. Look for error messages (they will be in red)
5. Copy any error messages you see

### 5. Expected Success Flow

When registration succeeds:
1. ✅ Green message appears: "Registration successful! Logging you in..."
2. ✅ After 2 seconds, you're automatically logged in
3. ✅ You see the ITSM Portal dashboard

## Common Error Messages

### "Registration failed" with error list

**Cause:** Your password doesn't meet requirements

**Solution:** The error will now show a list of specific issues:
- "Passwords must have at least one non alphanumeric character."
- "Passwords must have at least one digit ('0'-'9')."
- "Passwords must have at least one uppercase ('A'-'Z')."
- "Passwords must have at least one lowercase ('a'-'z')."

Create a password that addresses ALL the listed requirements.

### "User already exists"

**Cause:** Someone already registered with that email

**Solution:** Try a different email address or use the existing account to login

### "Passwords do not match"

**Cause:** Password and Confirm Password fields don't match

**Solution:** Make sure both fields have the exact same value

### "Network Error" or "Registration failed. Please try again."

**Cause:** Backend API is not running or can't be reached

**Solution:** 
1. Make sure the backend is running on `https://localhost:7060`
2. Check that you don't have firewall blocking the connection
3. Try restarting both backend and frontend

## Testing the Password Validation

Want to see what errors you get? Try these:

**Test 1 - Too Simple:**
- Email: `user1@test.com`
- Password: `password`
- Expected Error: Missing uppercase, digit, and special character

**Test 2 - No Special Character:**
- Email: `user2@test.com`
- Password: `Password123`
- Expected Error: Must have at least one special character

**Test 3 - Valid Password:**
- Email: `user3@test.com`
- Password: `Test@123`
- Expected: ✅ Success!

## Quick Fix Summary

I've updated your code to:

1. ✅ **Better Error Messages** - Backend now returns user-friendly error lists
2. ✅ **Detailed Display** - Frontend shows all validation errors clearly
3. ✅ **Console Logging** - Errors are logged to browser console for debugging
4. ✅ **Clear Requirements** - Password requirements shown on the form

## Still Having Issues?

If you're still getting "registration failed" after following this guide:

1. **Check the browser console** (F12 → Console tab) and share the error
2. **Verify the backend is running** and check for error messages in the terminal
3. **Try a super simple test password**: `Test@123`
4. **Check if the database is accessible** - run: `dotnet ef database update` in the API folder

## Next Steps

Once registration works:
- ✅ Your account will be created with role: "User"
- ✅ You'll be automatically logged in
- ✅ You can create tickets and use the portal

Good luck! The improved error messages should now tell you exactly what's wrong.
