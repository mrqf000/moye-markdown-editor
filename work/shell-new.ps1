function Register-MoyeShellNew {
 param([string]$Exe,[string]$Classes='HKCU:\Software\Classes',[string]$State='HKCU:\Software\Moye\ShellNewState')
 if(!(Test-Path -LiteralPath $Exe -PathType Leaf)){throw '请先安装墨页，再启用右键新建 MD 文档。'}
 $extension="$Classes\.md"
 if(!(Test-Path -LiteralPath $State)){
  New-Item -Path $State -Force | Out-Null
  $previous=if(Test-Path -LiteralPath $extension){(Get-Item -LiteralPath $extension).GetValue('')}else{$null}
  New-ItemProperty $State -Name HadDefault -Value ([int]($null -ne $previous)) -PropertyType DWord -Force | Out-Null
  if($null -ne $previous){New-ItemProperty $State -Name PreviousDefault -Value $previous -PropertyType String -Force | Out-Null}
 }
 New-Item -Path "$Classes\Moye.Markdown\shell\open\command" -Force | Set-Item -Value "`"$Exe`" `"%1`""
 Set-Item -LiteralPath "$Classes\Moye.Markdown" -Value 'Markdown 文档'
 New-Item -Path "$Classes\Moye.Markdown\DefaultIcon" -Force | Set-Item -Value "`"$Exe`",0"
 New-Item -Path $extension -Force | Set-Item -Value 'Moye.Markdown'
 $shellNew="$extension\ShellNew"
 if(!(Test-Path -LiteralPath $shellNew)){
  New-Item -Path $shellNew -Force | Out-Null
  New-ItemProperty $shellNew -Name NullFile -Value '' -PropertyType String -Force | Out-Null
  New-ItemProperty $shellNew -Name MoyeOwner -Value 1 -PropertyType DWord -Force | Out-Null
 }
}
function Unregister-MoyeShellNew {
 param([string]$Classes='HKCU:\Software\Classes',[string]$State='HKCU:\Software\Moye\ShellNewState')
 $extension="$Classes\.md";$shellNew="$extension\ShellNew"
 if((Get-ItemPropertyValue $shellNew -Name MoyeOwner -ErrorAction SilentlyContinue) -eq 1){Remove-Item -LiteralPath $shellNew -Recurse}
 if(Test-Path -LiteralPath $State){
  if((Test-Path -LiteralPath $extension) -and (Get-Item -LiteralPath $extension).GetValue('') -eq 'Moye.Markdown'){
   $saved=Get-ItemProperty -LiteralPath $State
   if($saved.HadDefault){Set-Item -LiteralPath $extension -Value $saved.PreviousDefault}else{Remove-ItemProperty -LiteralPath $extension -Name '(default)' -ErrorAction SilentlyContinue}
  }
  Remove-Item -LiteralPath $State -Recurse
 }
}
function Update-MoyeShellAssociations {
 if(!('MoyeShellNotify' -as [type])){Add-Type 'using System;using System.Runtime.InteropServices;public static class MoyeShellNotify{[DllImport("shell32.dll")]public static extern void SHChangeNotify(uint e,uint f,IntPtr a,IntPtr b);}' }
 [MoyeShellNotify]::SHChangeNotify(0x08000000,0,[IntPtr]::Zero,[IntPtr]::Zero)
}
