param([switch]$NoLaunch,[switch]$ValidateOnly)
$ErrorActionPreference='Stop'
$destination=Join-Path $env:LOCALAPPDATA 'Programs\Moye'
$source=$PSScriptRoot
$exe=Join-Path $destination 'Moye.exe'
if(![Environment]::Is64BitOperatingSystem){throw '墨页需要 64 位 Windows 10 或 Windows 11。'}
$release=Get-ItemPropertyValue 'HKLM:\SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full' -Name Release -ErrorAction SilentlyContinue
if(!$release -or $release -lt 528040){throw '请先安装 Microsoft .NET Framework 4.8，然后重新安装墨页：https://dotnet.microsoft.com/download/dotnet-framework/net48'}
$packageFiles=@('Moye.exe','Moye.exe.config','Microsoft.Web.WebView2.Core.dll','Microsoft.Web.WebView2.WinForms.dll','WebView2Loader.dll','WebView2-LICENSE.txt','使用说明.md','uninstall.ps1','shell-new.ps1','app/index.html')
foreach($file in $packageFiles){if(!(Test-Path -LiteralPath (Join-Path $source $file) -PathType Leaf)){throw "安装包缺少文件：$file"}}
function Test-WebViewRuntime {
 foreach($key in @('HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}','HKCU:\Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}')){
  $pv=Get-ItemPropertyValue $key -Name pv -ErrorAction SilentlyContinue
  if($pv -and [version]$pv -gt [version]'0.0.0.0'){return $true}
 }
 return $false
}
if($ValidateOnly){Write-Output "Package valid; WebView2 present: $(Test-WebViewRuntime)";exit 0}
if(Get-Process Moye -ErrorAction SilentlyContinue | Where-Object {$_.Path -eq $exe}){throw '请先关闭已安装的墨页窗口，然后重新安装。'}
if(!(Test-WebViewRuntime)){
 Write-Output '正在安装 Microsoft WebView2，首次安装需要联网。'
 $runtime=Join-Path ([IO.Path]::GetTempPath()) ('Moye-WebView2-'+[guid]::NewGuid().ToString('N')+'.exe')
 try{
  [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
  $client=New-Object Net.WebClient
  try{$client.DownloadFile('https://go.microsoft.com/fwlink/p/?LinkId=2124703',$runtime)}finally{$client.Dispose()}
  $signature=Get-AuthenticodeSignature -LiteralPath $runtime
  if($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'O=Microsoft Corporation'){throw 'Microsoft 运行组件的签名验证失败，请重试。'}
  $process=Start-Process -FilePath $runtime -ArgumentList '/silent','/install' -WindowStyle Hidden -Wait -PassThru
  if(!(Test-WebViewRuntime)){throw 'WebView2 安装未完成。请检查网络连接并重新安装墨页。'}
 }finally{if(Test-Path -LiteralPath $runtime){Remove-Item -LiteralPath $runtime -Force}}
}
New-Item -ItemType Directory -Force -Path $destination | Out-Null
foreach($name in @('Moye.exe','Moye.exe.config','Microsoft.Web.WebView2.Core.dll','Microsoft.Web.WebView2.WinForms.dll','WebView2Loader.dll','WebView2-LICENSE.txt','使用说明.md','uninstall.ps1','shell-new.ps1','app')){
 Copy-Item -LiteralPath (Join-Path $source $name) -Destination $destination -Recurse -Force
}
$classes='HKCU:\Software\Classes'
$prog=New-Item -Path "$classes\Moye.Markdown" -Force
Set-Item -Path $prog.PSPath -Value 'Markdown 文档（墨页）'
New-Item "$classes\Moye.Markdown\DefaultIcon" -Force | Set-Item -Value "`"$exe`",0"
New-Item "$classes\Moye.Markdown\shell\open\command" -Force | Set-Item -Value "`"$exe`" `"%1`""
New-Item "$classes\Applications\Moye.exe\shell\open\command" -Force | Set-Item -Value "`"$exe`" `"%1`""
New-ItemProperty "$classes\Applications\Moye.exe" -Name FriendlyAppName -Value '墨页' -Force | Out-Null
foreach($extension in @('.md','.markdown')){
 New-Item "$classes\$extension\OpenWithProgids" -Force | Out-Null
 New-ItemProperty "$classes\$extension\OpenWithProgids" -Name 'Moye.Markdown' -PropertyType String -Value '' -Force | Out-Null
 New-Item "$classes\Applications\Moye.exe\SupportedTypes" -Force | Out-Null
 New-ItemProperty "$classes\Applications\Moye.exe\SupportedTypes" -Name $extension -PropertyType String -Value '' -Force | Out-Null
}
$capabilities='HKCU:\Software\Moye\Capabilities'
New-Item "$capabilities\FileAssociations" -Force | Out-Null
New-ItemProperty $capabilities -Name ApplicationName -Value '墨页' -Force | Out-Null
New-ItemProperty $capabilities -Name ApplicationDescription -Value '简洁的 Markdown 可视化编辑器，支持多文档、本地保存与代码高亮。' -Force | Out-Null
New-ItemProperty $capabilities -Name ApplicationIcon -Value "`"$exe`",0" -Force | Out-Null
foreach($extension in @('.md','.markdown')){New-ItemProperty "$capabilities\FileAssociations" -Name $extension -Value 'Moye.Markdown' -Force | Out-Null}
New-Item 'HKCU:\Software\RegisteredApplications' -Force | Out-Null
New-ItemProperty 'HKCU:\Software\RegisteredApplications' -Name Moye -Value 'Software\Moye\Capabilities' -Force | Out-Null
$shell=New-Object -ComObject WScript.Shell
foreach($folder in @([Environment]::GetFolderPath('Desktop'),[Environment]::GetFolderPath('Programs'))){
 $shortcut=$shell.CreateShortcut((Join-Path $folder '墨页.lnk'));$shortcut.TargetPath=$exe;$shortcut.WorkingDirectory=$destination;$shortcut.Description='墨页 Markdown 编辑器';$shortcut.IconLocation="$exe,0";$shortcut.Save()
}
Write-Output "墨页已安装到 $destination"
$uninstallKey='HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Moye'
New-Item $uninstallKey -Force | Out-Null
foreach($entry in @{'DisplayName'='墨页';'DisplayVersion'='2026.09.17';'Publisher'='墨页';'InstallLocation'=$destination;'DisplayIcon'="$exe,0";'UninstallString'="powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$(Join-Path $destination 'uninstall.ps1')`""}.GetEnumerator()){
 New-ItemProperty $uninstallKey -Name $entry.Key -Value $entry.Value -PropertyType String -Force | Out-Null
}
foreach($name in @('NoModify','NoRepair')){New-ItemProperty $uninstallKey -Name $name -Value 1 -PropertyType DWord -Force | Out-Null}
. (Join-Path $source 'shell-new.ps1')
Register-MoyeShellNew -Exe $exe
Update-MoyeShellAssociations
if(!$NoLaunch){Start-Process -FilePath $exe;Start-Process 'ms-settings:defaultapps?registeredAppUser=Moye'}
