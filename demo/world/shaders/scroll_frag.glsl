#version 300 es
precision highp float;
precision highp int;

in vec2 vUV;
in vec3 vPosition;
in vec4 vColor;
in vec3 vNormal;
in float vMaterial;

out vec4 fragColor;

uniform vec4 uUVTransform;
uniform sampler2D uSampler;

uniform GlobalUniforms {
    vec4 uTime;
};
uniform CameraUniforms {
    mat4 uViewProjectionMatrix;
    mat4 uViewMatrix;
    vec3 uEyePosition;
};

#define TAU 6.283185307179586

void main(){
    vec2 uv = vUV;
#ifdef POLAR
    uv = uv*2.-1.;
    uv = vec2(atan(uv.y,uv.x)/TAU+.5,length(uv));
#endif
    uv = uUVTransform.xy + uv * uUVTransform.zw;

    uv += vec2(0,-0.6*uTime.x);
    vec4 color = texture(uSampler,uv);
    color *= smoothstep(.0,.2,1.-vUV.y);

#ifdef FRESNEL
    vec3 position = vPosition;
    vec3 normal = normalize(vNormal);
    vec3 view = normalize(uEyePosition - position);
    float NdV = abs(dot(normal, view));
    color *= smoothstep(0.1,0.5,NdV);
#endif

#ifdef DISSOLVE
    float edge = 0.1;
    float threshold = mix(1.0, -edge, vColor.a);
    color *= smoothstep(threshold, threshold + edge, color.a);
#else
    color *= vColor;
#endif
    fragColor = color;
}