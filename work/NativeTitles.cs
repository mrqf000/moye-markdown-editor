using System;
using System.Net;
using System.Net.Http;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Collections.Generic;
using System.IO;
using System.Text;

internal static class NativeTitles {
 static readonly JavaScriptSerializer Json=new JavaScriptSerializer();
 static void Validate(Uri u){if((u.Scheme!="https"&&u.Scheme!="http")||!u.IsDefaultPort||!String.IsNullOrEmpty(u.UserInfo))throw new Exception("请使用公开的 http 或 https 网页链接。");if(u.Host.Equals("moye.local",StringComparison.OrdinalIgnoreCase))throw new Exception("无法获取此链接的标题。");foreach(var ip in Dns.GetHostAddresses(u.Host)){var b=ip.GetAddressBytes();if(IPAddress.IsLoopback(ip)||ip.IsIPv6LinkLocal||ip.IsIPv6SiteLocal||(b.Length==4&&(b[0]==10||b[0]==127||b[0]==0||b[0]==169&&b[1]==254||b[0]==192&&b[1]==168||b[0]==172&&b[1]>=16&&b[1]<=31))||(b.Length==16&&(b[0]&254)==252))throw new Exception("仅支持公开网页的标题。");}}
 static async Task<string> Fetch(string url){using(var handler=new HttpClientHandler{AllowAutoRedirect=false,UseCookies=false,AutomaticDecompression=DecompressionMethods.GZip|DecompressionMethods.Deflate})using(var client=new HttpClient(handler)){client.Timeout=TimeSpan.FromSeconds(12);client.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 Moye/1.0");var uri=new Uri(url);for(int i=0;i<5;i++){Validate(uri);using(var response=await client.GetAsync(uri,HttpCompletionOption.ResponseHeadersRead)){if((int)response.StatusCode>=300&&(int)response.StatusCode<400){if(response.Headers.Location==null)break;uri=new Uri(uri,response.Headers.Location);continue;}response.EnsureSuccessStatusCode();using(var stream=await response.Content.ReadAsStreamAsync())using(var memory=new MemoryStream()){byte[] buffer=new byte[8192];int n;while(memory.Length<768*1024&&(n=await stream.ReadAsync(buffer,0,buffer.Length))>0)memory.Write(buffer,0,n);Encoding encoding=Encoding.UTF8;try{var charset=response.Content.Headers.ContentType.CharSet;if(!String.IsNullOrEmpty(charset))encoding=Encoding.GetEncoding(charset.Trim('"'));}catch{}return encoding.GetString(memory.ToArray());}}}throw new Exception("网页重定向过多。");}}
 public static async Task<string> GetTitle(string url){try{var uri=new Uri(url);Validate(uri);var bv=Regex.Match(uri.AbsolutePath,@"/(BV[\w]+)");if((uri.Host=="bilibili.com"||uri.Host.EndsWith(".bilibili.com"))&&bv.Success){var data=Json.Deserialize<Dictionary<string,object>>(await Fetch("https://api.bilibili.com/x/web-interface/view?bvid="+bv.Groups[1].Value));object value;if(data.TryGetValue("data",out value)&&value is Dictionary<string,object>){var body=(Dictionary<string,object>)value;if(body.ContainsKey("title"))return Clean(Convert.ToString(body["title"]));}}
 var html=await Fetch(url);foreach(Match tag in Regex.Matches(html,@"<meta\b[^>]*>",RegexOptions.IgnoreCase)){var attr=new Dictionary<string,string>(StringComparer.OrdinalIgnoreCase);foreach(Match a in Regex.Matches(tag.Value,"([\\w:-]+)\\s*=\\s*([\"'])(.*?)\\2",RegexOptions.Singleline))attr[a.Groups[1].Value]=a.Groups[3].Value;string key,content;if(!attr.TryGetValue("property",out key))attr.TryGetValue("name",out key);if((key=="og:title"||key=="twitter:title")&&attr.TryGetValue("content",out content)&&!String.IsNullOrWhiteSpace(content))return Clean(content);}
 var title=Regex.Match(html,@"<title\b[^>]*>(.*?)</title>",RegexOptions.IgnoreCase|RegexOptions.Singleline);if(title.Success)return Clean(title.Groups[1].Value);throw new Exception("网页未提供标题，可手动输入。");}catch(Exception ex){throw new Exception("暂时无法获取原标题："+ex.Message);}}
 static string Clean(string value){value=Regex.Replace(WebUtility.HtmlDecode(value),@"\s+"," ").Trim();return value.Substring(0,Math.Min(500,value.Length));}
}
