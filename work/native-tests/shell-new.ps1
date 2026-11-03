$ErrorActionPreference='Stop'
$root=Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
. (Join-Path $root 'outputs\墨页桌面版\shell-new.ps1')
# The sandbox denies registry writes. Exercise the actual registration functions
# against an in-memory registry, with no changes to Windows or its associations.
$script:registry=@{}
function Test-Path {param($Path,$LiteralPath,$PathType) $key=if($LiteralPath){$LiteralPath}else{$Path};if($PathType -eq 'Leaf'){return [IO.File]::Exists($key)};return $script:registry.ContainsKey($key)}
function Get-Item {
 param($Path,$LiteralPath,$ErrorAction)
 $key=if($LiteralPath){$LiteralPath}else{$Path};if(!$script:registry.ContainsKey($key)){return $null}
 $item=[pscustomobject]@{PSPath=$key}
 $item | Add-Member ScriptMethod GetValue {param($name) $script:registry[$this.PSPath][$name]}
 $item | Add-Member ScriptMethod GetValueNames {@($script:registry[$this.PSPath].Keys)}
 return $item
}
function New-Item {param($Path,[switch]$Force) $parts=$Path.Split('\');for($i=1;$i -le $parts.Length;$i++){$key=($parts[0..($i-1)] -join '\');if(!$script:registry.ContainsKey($key)){$script:registry[$key]=@{}}};Get-Item $Path}
function Set-Item {
 param([Parameter(ValueFromPipeline=$true)]$InputObject,[Parameter(Position=0)]$Path,$LiteralPath,$Value)
 process{$key=if($LiteralPath){$LiteralPath}elseif($Path){$Path}else{$InputObject.PSPath};$script:registry[$key]['']=$Value}
}
function New-ItemProperty {param($Path,$Name,$Value,$PropertyType,[switch]$Force) $script:registry[$Path][$Name]=$Value}
function Get-ItemProperty {param($LiteralPath) [pscustomobject]$script:registry[$LiteralPath]}
function Get-ItemPropertyValue {param($Path,$Name,$ErrorAction) if($script:registry.ContainsKey($Path)){return $script:registry[$Path][$Name]}}
function Remove-ItemProperty {param($LiteralPath,$Name,$ErrorAction) $script:registry[$LiteralPath].Remove($(if($Name -eq '(default)'){''}else{$Name}))}
function Remove-Item {param($LiteralPath,[switch]$Recurse,[switch]$Force) foreach($key in @($script:registry.Keys)){if($key -eq $LiteralPath -or $key.StartsWith($LiteralPath+'\')){$script:registry.Remove($key)}}}
$testKey='Mock:\MoyeShellNewTest'
$classes="$testKey\Classes";$state="$testKey\State"
$exe=Join-Path $root 'outputs\墨页桌面版\Moye.exe'
try{
 Register-MoyeShellNew -Exe $exe -Classes $classes -State $state
 if((Get-Item "$classes\.md").GetValue('') -ne 'Moye.Markdown'){throw 'File type registration failed'}
 if((Get-Item "$classes\.md\ShellNew").GetValueNames() -notcontains 'NullFile'){throw 'Blank file creation registration failed'}
 if((Get-Item "$classes\Moye.Markdown\shell\open\command").GetValue('') -ne "`"$exe`" `"%1`""){throw 'Open command quoting failed'}
 Register-MoyeShellNew -Exe $exe -Classes $classes -State $state
 Unregister-MoyeShellNew -Classes $classes -State $state
 if(Test-Path "$classes\.md\ShellNew"){throw 'Owned menu was not removed'}
 if((Get-Item "$classes\.md").GetValueNames() -contains ''){throw 'Absent previous default was not restored'}
 Set-Item "$classes\.md" -Value 'OtherEditor.Markdown'
 New-Item "$classes\.md\ShellNew" -Force | Out-Null
 New-ItemProperty "$classes\.md\ShellNew" -Name FileName -Value 'other-template.md' | Out-Null
 Register-MoyeShellNew -Exe $exe -Classes $classes -State $state
 Register-MoyeShellNew -Exe $exe -Classes $classes -State $state
 Unregister-MoyeShellNew -Classes $classes -State $state
 if((Get-Item "$classes\.md").GetValue('') -ne 'OtherEditor.Markdown'){throw 'Previous default not restored after repeated registration'}
 if((Get-ItemProperty -LiteralPath "$classes\.md\ShellNew").FileName -ne 'other-template.md'){throw 'Existing template was changed'}
 Write-Output 'Passed with in-memory registry: empty MD registration, quoted opening, repeated installation, owned cleanup, previous association and existing template preserved.'
}finally{if(Test-Path -LiteralPath $testKey){Remove-Item -LiteralPath $testKey -Recurse -Force}}
