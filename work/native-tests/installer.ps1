param([string]$InstallerName='墨页安装包.exe')
$ErrorActionPreference='Stop'
$root=Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$testDir=Join-Path $root ('work\native-tests\installer-'+[guid]::NewGuid().ToString('N'))
$setup=Join-Path (Join-Path $root 'outputs') $InstallerName
function Get-Sha256([string]$Path){
 $stream=[IO.File]::OpenRead($Path);$algorithm=[Security.Cryptography.SHA256]::Create()
 try{return [BitConverter]::ToString($algorithm.ComputeHash($stream)).Replace('-','')}finally{$algorithm.Dispose();$stream.Dispose()}
}
try{
 $process=Start-Process -FilePath $setup -ArgumentList '/extract',"`"$testDir`"" -WindowStyle Hidden -Wait -PassThru
 if($process.ExitCode -ne 0){throw 'Installer extraction failed'}
 $files=Get-ChildItem -LiteralPath $testDir -Recurse -File
 if($files.Count -ne 11){throw "Unexpected payload file count: $($files.Count)"}
 $testPrefix=[IO.Path]::GetFullPath($testDir).TrimEnd('\')+'\'
 foreach($file in $files){
  $fullName=[IO.Path]::GetFullPath($file.FullName)
  if(!$fullName.StartsWith($testPrefix,[StringComparison]::OrdinalIgnoreCase)){throw "Payload escaped test directory: $fullName"}
  $relative=$fullName.Substring($testPrefix.Length)
  $original=Join-Path $root "outputs\墨页桌面版\$relative"
  if((Get-Sha256 $file.FullName) -ne (Get-Sha256 $original)){throw "Payload mismatch: $relative"}
 }
 foreach($script in @('install.ps1','uninstall.ps1','shell-new.ps1')){
  $parseErrors=$null;$tokens=$null
  [Management.Automation.Language.Parser]::ParseFile((Join-Path $testDir $script),[ref]$tokens,[ref]$parseErrors) | Out-Null
  if($parseErrors.Count){throw ($parseErrors | Out-String)}
 }
 & powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File (Join-Path $testDir 'install.ps1') -ValidateOnly
 if($LASTEXITCODE -ne 0){throw 'Windows PowerShell package validation failed'}
 if(!(Select-String -LiteralPath (Join-Path $testDir 'app\index.html') -SimpleMatch 'moye-outline-sidebar-open-v1')){throw 'Installer did not include latest app'}
 $image=Join-Path $root 'outputs\安装界面高清检查.png'
 $ui=Start-Process -FilePath $setup -ArgumentList '/verify-ui',"`"$image`"" -WindowStyle Hidden -Wait -PassThru
 $uiReport=[IO.File]::ReadAllText($image+'.txt')
 if($ui.ExitCode -ne 0){throw $uiReport}
 Write-Output $uiReport
 Write-Output "Passed: executable extraction, all 11 payload hashes, scripts parse, Windows PowerShell prerequisites, latest application. Size: $((Get-Item $setup).Length) bytes."
}finally{
 # Verify the temporary target is inside the test workspace before recursive cleanup.
 $resolved=[IO.Path]::GetFullPath($testDir)
 $testRoot=[IO.Path]::GetFullPath($PSScriptRoot).TrimEnd('\')+'\'
 if(!$resolved.StartsWith($testRoot,[StringComparison]::OrdinalIgnoreCase)){throw 'Invalid cleanup path'}
 if(Test-Path -LiteralPath $resolved){Remove-Item -LiteralPath $resolved -Recurse -Force}
}
