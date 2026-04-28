const { execSync } = require('child_process');

/**
 * Windows System Notification (Toast) - Robust Version
 */
function sendNotification(title = "Gemini CLI", message = "요청하신 작업이 완료되었습니다!") {
  // PowerShell 명령어를 더 견고하게 수정
  // 1. 어셈블리 로드 방식 개선
  // 2. 알림 아이콘 보존을 위한 Sleep 추가
  // 3. 자원 해제(Dispose) 명시
  const psCommand = `
    [reflection.assembly]::loadwithpartialname('System.Windows.Forms') | Out-Null;
    [reflection.assembly]::loadwithpartialname('System.Drawing') | Out-Null;
    $notify = New-Object System.Windows.Forms.NotifyIcon;
    $notify.Icon = [System.Drawing.SystemIcons]::Information;
    $notify.Visible = $true;
    $notify.ShowBalloonTip(5000, '${title.replace(/'/g, "''")}', '${message.replace(/'/g, "''")}', [System.Windows.Forms.ToolTipIcon]::Info);
    Start-Sleep -s 2;
    $notify.Dispose();
  `.replace(/\n/g, '');

  try {
    execSync(`powershell -Command "${psCommand}"`, { stdio: 'inherit' });
  } catch (error) {
    console.log(`\n🔔 [콘솔 출력] ${title}: ${message}`);
  }
}

const args = process.argv.slice(2);
const customMsg = args.join(' ');

sendNotification("Gemini CLI 알림 확인", customMsg || undefined);
