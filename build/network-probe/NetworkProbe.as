package {
 import flash.display.Sprite;
 import flash.desktop.NativeApplication;
 import flash.filesystem.File;
 import flash.filesystem.FileMode;
 import flash.filesystem.FileStream;
 import flash.utils.getTimer;
 import flash.utils.setTimeout;
 public class NetworkProbe extends Sprite {
  private var gs_:Object = {map:{name_:"offline-test"}};
  private var gameId_:int = 0;
  private var labInvResultSequence:int = 0;
  private var labInvResultCode:int = -1;
  private var labRecentUses_:Array = [];
  private static var labNetworkFile_:String = "probe.jsonl";
  public function NetworkProbe() { setTimeout(run,10); }
  private function run():void {
   try { labNetworkLog("probe"); trace("NETWORK_PROBE_PASS"); NativeApplication.nativeApplication.exit(0); }
   catch(e:Error) { trace("NETWORK_PROBE_FAIL "+e.toString()); NativeApplication.nativeApplication.exit(1); }
  }
private function labNetworkLog(eventName:String, detail:String = "") : void
      {
         var stream:FileStream = null;
         try
         {
            // Explicit fields only: never serialize packets, login or reconnect keys.
            var record:Object = {time:new Date().time,ms:getTimer(),event:eventName,profile:NativeApplication.nativeApplication.applicationID,map:this.gs_ != null && this.gs_.map != null ? this.gs_.map.name_ : "",gameId:this.gameId_,detail:detail.substr(0,512),invSequence:this.labInvResultSequence,invResult:this.labInvResultCode,recentUses:this.labRecentUses_};
            var line:String = JSON.stringify(record);
            trace("[Lab network] " + line);
            stream = new FileStream();
            stream.open(File.applicationStorageDirectory.resolvePath(labNetworkFile_),FileMode.APPEND);
            stream.writeUTFBytes(line + "\n");
         }
         catch(error:Error) { trace("[Lab network] Could not persist diagnostic: " + error.errorID); }
         // Keep cleanup outside finally: JPEXS emits invalid AVM2 for nested catch in finally.
         if(stream != null) { try { stream.close(); } catch(closeError:Error) {} }
      }
 }
}
