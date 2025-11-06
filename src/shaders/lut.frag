// Color LUT (Look-Up Table) shader for color grading

precision highp float;

uniform sampler2D tDiffuse;
uniform sampler2D tLUT;
uniform float intensity;

varying vec2 vUv;

vec3 applyLUT(vec3 color, sampler2D lut) {
  // Standard 3D LUT application
  // Assumes LUT is 16x16x16 or 32x32x32
  
  float lutSize = 16.0;
  float scale = (lutSize - 1.0) / lutSize;
  float offset = 1.0 / (2.0 * lutSize);
  
  // Sample the LUT
  float blue = color.b * (lutSize - 1.0);
  float blueFloor = floor(blue);
  float blueCeil = ceil(blue);
  float blueLerp = blue - blueFloor;
  
  vec2 uvFloor;
  uvFloor.x = (color.r * scale + offset + blueFloor) / lutSize;
  uvFloor.y = color.g * scale + offset;
  
  vec2 uvCeil = uvFloor;
  uvCeil.x = (color.r * scale + offset + blueCeil) / lutSize;
  
  vec3 colorFloor = texture2D(lut, uvFloor).rgb;
  vec3 colorCeil = texture2D(lut, uvCeil).rgb;
  
  return mix(colorFloor, colorCeil, blueLerp);
}

void main() {
  vec4 color = texture2D(tDiffuse, vUv);
  vec3 gradedColor = applyLUT(color.rgb, tLUT);
  
  // Blend with original based on intensity
  vec3 finalColor = mix(color.rgb, gradedColor, intensity);
  
  gl_FragColor = vec4(finalColor, color.a);
}
