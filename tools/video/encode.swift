// Encode a folder of PNG frames (f0000.png …) into an H.264 MP4 with Apple's
// AVFoundation, so no ffmpeg is needed. Usage:
//   swiftc -O encode.swift -o encode && ./encode <framesDir> <out.mp4> [fps=30]
import AVFoundation
import CoreGraphics
import Foundation
import ImageIO

let args = CommandLine.arguments
guard args.count >= 3 else { print("usage: encode <framesDir> <out.mp4> [fps]"); exit(1) }
let framesDir = URL(fileURLWithPath: args[1])
let outURL = URL(fileURLWithPath: args[2])
let fps = Int32(args.count > 3 ? Int(args[3]) ?? 30 : 30)

let files = try FileManager.default.contentsOfDirectory(atPath: framesDir.path)
  .filter { $0.hasSuffix(".png") }.sorted()
guard let first = files.first,
      let src0 = CGImageSourceCreateWithURL(framesDir.appendingPathComponent(first) as CFURL, nil),
      let img0 = CGImageSourceCreateImageAtIndex(src0, 0, nil) else { print("no frames"); exit(1) }
let width = img0.width, height = img0.height

try? FileManager.default.removeItem(at: outURL)
let writer = try AVAssetWriter(outputURL: outURL, fileType: .mp4)
let settings: [String: Any] = [
  AVVideoCodecKey: AVVideoCodecType.h264,
  AVVideoWidthKey: width,
  AVVideoHeightKey: height,
  AVVideoCompressionPropertiesKey: [
    AVVideoAverageBitRateKey: 6_000_000,
    AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
    AVVideoExpectedSourceFrameRateKey: fps,
    AVVideoMaxKeyFrameIntervalKey: fps * 2,
  ],
  AVVideoColorPropertiesKey: [
    AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2,
    AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2,
    AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2,
  ],
]
let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
input.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
  kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB,
  kCVPixelBufferWidthKey as String: width,
  kCVPixelBufferHeightKey as String: height,
])
writer.add(input)
guard writer.startWriting() else { print("startWriting failed: \(String(describing: writer.error))"); exit(1) }
writer.startSession(atSourceTime: .zero)
let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!

for (i, name) in files.enumerated() {
  autoreleasepool {
    while !input.isReadyForMoreMediaData { usleep(2000) }
    guard let src = CGImageSourceCreateWithURL(framesDir.appendingPathComponent(name) as CFURL, nil),
          let img = CGImageSourceCreateImageAtIndex(src, 0, nil),
          let pool = adaptor.pixelBufferPool else { return }
    var pb: CVPixelBuffer?
    CVPixelBufferPoolCreatePixelBuffer(nil, pool, &pb)
    guard let buffer = pb else { return }
    CVPixelBufferLockBaseAddress(buffer, [])
    let ctx = CGContext(data: CVPixelBufferGetBaseAddress(buffer), width: width, height: height,
                        bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
                        space: colorSpace, bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue)
    ctx?.draw(img, in: CGRect(x: 0, y: 0, width: width, height: height))
    CVPixelBufferUnlockBaseAddress(buffer, [])
    adaptor.append(buffer, withPresentationTime: CMTime(value: Int64(i), timescale: fps))
  }
}
input.markAsFinished()
let done = DispatchSemaphore(value: 0)
writer.finishWriting { done.signal() }
done.wait()
if writer.status == .completed {
  print("wrote \(outURL.path): \(files.count) frames, \(width)x\(height) @ \(fps)fps")
} else {
  print("failed: \(String(describing: writer.error))"); exit(1)
}
