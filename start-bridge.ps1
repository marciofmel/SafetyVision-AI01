$env:TELEGRAM_BOT_TOKEN = "8667608055:AAEfJMJtKeBC0VcppeG3xr6jEShGPtsnpUc"
cd C:\Users\Marcio\.config\opencode\bridge
node index.js 2>&1 | Out-File -FilePath "C:\Users\Marcio\Downloads\SafetyVisionAI\bridge.log" -Encoding utf8
