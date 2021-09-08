#version 300 es
precision highp float;
in vec2 vUV;
in vec3 vOrigin;
in vec3 vRay;
layout(location=0) out vec4 fragPosition;
layout(location=1) out vec4 fragNormal;
layout(location=2) out vec4 fragAlbedo;

uniform CameraUniforms {
    mat4 uViewProjectionMatrix;
    mat4 uProjectionMatrix;
    mat4 uViewMatrix;
    vec3 uEyePosition;
};
uniform float uLayer;
uniform vec4 uFogColor;
uniform vec3 uSkyColor;

void main(){
    vec3 position = vOrigin + vRay;
    vec3 ray = normalize(vRay);
    gl_FragDepth = gl_DepthRange.far;
    fragPosition = vec4(position,uLayer);
    fragNormal = vec4(-ray*0.0,0.5);

    float rayDotUp = max(0.0,dot(vec3(0,1,0),ray));
    vec3 color = mix(uFogColor.rgb, uSkyColor, rayDotUp);
    fragAlbedo = vec4(color,0);
}