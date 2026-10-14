// Put an audio track (AAC .m4a) under a video (H.264 .mp4) without
// re-encoding either: AVFoundation passthrough export to MP4.
//   swiftc -O mux.swift -o mux && ./mux <video.mp4> <audio.m4a> <out.mp4>
import AVFoundation
import Foundation

let args = CommandLine.arguments
guard args.count == 4 else { print("usage: mux <video.mp4> <audio.m4a> <out.mp4>"); exit(1) }
let video = AVURLAsset(url: URL(fileURLWithPath: args[1]))
let audio = AVURLAsset(url: URL(fileURLWithPath: args[2]))
let outURL = URL(fileURLWithPath: args[3])

let comp = AVMutableComposition()
guard let vSrc = video.tracks(withMediaType: .video).first,
      let aSrc = audio.tracks(withMediaType: .audio).first,
      let vDst = comp.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid),
      let aDst = comp.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)
else { print("missing track"); exit(1) }

let vDur = video.duration
let aDur = audio.duration
try vDst.insertTimeRange(CMTimeRange(start: .zero, duration: vDur), of: vSrc, at: .zero)
try aDst.insertTimeRange(CMTimeRange(start: .zero, duration: CMTimeMinimum(vDur, aDur)), of: aSrc, at: .zero)
vDst.preferredTransform = vSrc.preferredTransform

try? FileManager.default.removeItem(at: outURL)
guard let export = AVAssetExportSession(asset: comp, presetName: AVAssetExportPresetPassthrough) else { print("no export session"); exit(1) }
export.outputURL = outURL
export.outputFileType = .mp4
export.shouldOptimizeForNetworkUse = true
let done = DispatchSemaphore(value: 0)
export.exportAsynchronously { done.signal() }
done.wait()
if export.status == .completed {
  print("wrote \(outURL.path): video \(CMTimeGetSeconds(vDur))s, audio \(CMTimeGetSeconds(aDur))s")
} else {
  print("export failed: \(String(describing: export.error))"); exit(1)
}
