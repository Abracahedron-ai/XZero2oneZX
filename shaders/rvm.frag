// RVM (Robust Video Matting) segmentation shader
// This is a placeholder - actual RVM would require a neural network inference
// For production, use TensorFlow.js or ONNX Runtime Web

precision highp float;

uniform sampler2D tDiffuse;
uniform sampler2D tMask;
uniform float maskThreshold;
uniform vec3 backgroundColor;

varying vec2 vUv;

void main() {
  vec4 color = texture2D(tDiffuse, vUv);
  vec4 mask = texture2D(tMask, vUv);
  
  // If mask alpha is below threshold, replace with background
  if (mask.a < maskThreshold) {
    gl_FragColor = vec4(backgroundColor, 1.0);
  } else {
    gl_FragColor = color;
  }
}
