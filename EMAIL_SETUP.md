# 📧 Email Setup Guide - MSMTP Configuration

## 🚀 Quick Setup

### 1. Configure MSMTP

Edit the MSMTP configuration file:
```bash
nano ~/.msmtprc
```

Replace the placeholder values with your actual email credentials:

```bash
# MSMTP Configuration for GitDone
defaults
auth           on
tls            on
tls_trust_file /etc/ssl/certs/ca-certificates.crt
logfile        ~/.msmtp.log

# Gmail account
account        gmail
host           smtp.gmail.com
port           587
from           git@gitdone.com
user           avoidaccess@gmail.com
password       yhrz lyny vqmt lbtj

# Set a default account
account default : gmail
```

### 2. Gmail App Password Setup

1. **Enable 2-Factor Authentication**
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Turn on 2-Step Verification

2. **Generate App Password**
   - Go to [App Passwords](https://myaccount.google.com/apppasswords)
   - Select "Mail" and "Other (Custom name)"
   - Enter "GitDone" as the name
   - Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

3. **Update Configuration**
   - Use your Gmail address as `user` and `from`
   - Use the 16-character app password as `password`

### 3. Test Email Configuration

Run the test script:
```bash
cd /home/hamr/PycharmProjects/gitdone/backend
node test-email.js
```

## 🔧 Alternative Email Providers

### Outlook/Hotmail
```bash
account        outlook
host           smtp-mail.outlook.com
port           587
from           your-email@outlook.com
user           your-email@outlook.com
password       your-password
```

### Yahoo Mail
```bash
account        yahoo
host           smtp.mail.yahoo.com
port           587
from           your-email@yahoo.com
user           your-email@yahoo.com
password       your-app-password
```

### Custom SMTP Server
```bash
account        custom
host           your-smtp-server.com
port           587
from           your-email@yourdomain.com
user           your-email@yourdomain.com
password       your-password
```

## 🧪 Testing

### Manual Test
```bash
# Test MSMTP directly
echo "Test email body" | msmtp -t your-test-email@example.com
```

### Through GitDone
1. Go to your event: http://localhost:3000/event/YOUR_EVENT_ID
2. Click "Send Reminder" for any step
3. Check the vendor's email for the magic link

## 🐛 Troubleshooting

### Common Issues

**"Authentication failed"**
- Check your app password (not your regular password)
- Ensure 2FA is enabled
- Verify the email address is correct

**"Connection refused"**
- Check firewall settings
- Verify SMTP host and port
- Try different port (465 for SSL, 587 for TLS)

**"Permission denied"**
- Ensure ~/.msmtprc has correct permissions: `chmod 600 ~/.msmtprc`
- Check file ownership

### Debug Mode
```bash
# Enable verbose logging
msmtp --debug -t your-email@example.com < /dev/null
```

### Check Logs
```bash
# View MSMTP logs
tail -f ~/.msmtp.log
```

## 📋 Configuration Checklist

- [ ] MSMTP installed (`msmtp --version`)
- [ ] ~/.msmtprc configured with correct credentials
- [ ] File permissions set (`chmod 600 ~/.msmtprc`)
- [ ] Gmail 2FA enabled
- [ ] App password generated
- [ ] Test email sent successfully
- [ ] GitDone backend restarted
- [ ] Magic links working in application

## 🎯 Next Steps

Once email is configured:

1. **Test Magic Links**: Create an event and send reminders
2. **Complete Steps**: Use magic links to test the full workflow
3. **Monitor Logs**: Check ~/.msmtp.log for any issues
4. **Production Setup**: Update configuration for production deployment

---

**Need Help?** Check the logs and ensure all credentials are correct. The most common issue is using the wrong password (use app password, not regular password).