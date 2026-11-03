$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
$destination=[IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'Programs\Moye'))
try{
 if([IO.Path]::GetFullPath($PSScriptRoot) -ne $destination){throw '请从 Windows 设置中的应用列表卸载墨页。'}
 $answer=[Windows.Forms.MessageBox]::Show('是否卸载墨页？你的 Markdown 文件和恢复草稿会保留。','卸载墨页','YesNo','Question')
 if($answer -ne 'Yes'){exit 0}
 $exe=Join-Path $destination 'Moye.exe'
 if(Get-Process Moye -ErrorAction SilentlyContinue | Where-Object {$_.Path -eq $exe}){throw '请先关闭墨页再卸载。'}
 . (Join-Path $destination 'shell-new.ps1')
 Unregister-MoyeShellNew
 Update-MoyeShellAssociations
 $shell=New-Object -ComObject WScript.Shell
 foreach($folder in @([Environment]::GetFolderPath('Desktop'),[Environment]::GetFolderPath('Programs'))){
  $shortcut=Join-Path $folder '墨页.lnk'
  if((Test-Path -LiteralPath $shortcut) -and $shell.CreateShortcut($shortcut).TargetPath -eq $exe){Remove-Item -LiteralPath $shortcut}
 }
 foreach($extension in @('.md','.markdown')){Remove-ItemProperty "HKCU:\Software\Classes\$extension\OpenWithProgids" -Name 'Moye.Markdown' -ErrorAction SilentlyContinue}
 foreach($key in @('HKCU:\Software\Classes\Moye.Markdown','HKCU:\Software\Classes\Applications\Moye.exe','HKCU:\Software\Moye\Capabilities','HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Moye')){if(Test-Path $key){Remove-Item -LiteralPath $key -Recurse}}
 Remove-ItemProperty 'HKCU:\Software\RegisteredApplications' -Name Moye -ErrorAction SilentlyContinue
 # Only this verified application directory is removed; documents and user profile remain.
 Remove-Item -LiteralPath $destination -Recurse -Force
 [Windows.Forms.MessageBox]::Show('墨页已卸载。','墨页') | Out-Null
}catch{[Windows.Forms.MessageBox]::Show($_.Exception.Message,'卸载未完成','OK','Error') | Out-Null;exit 1}
