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

const vec4 uVerticalFade = vec4(1.0,0.8, 0.2,0.6);

void main(){
    vec2 uv = vUV;
#ifdef POLAR
    uv = uv*2.-1.;
    uv = vec2(atan(uv.y,uv.x)/TAU+.5,length(uv));
#endif
    float fade = 1.0;
#ifdef VERTICAL_FADE
    fade *= smoothstep(uVerticalFade.x,uVerticalFade.y,uv.y);
    fade *= smoothstep(uVerticalFade.z,uVerticalFade.w,uv.y);
#endif
    uv = uUVTransform.xy + uv * uUVTransform.zw;
    vec4 color = vec4(0);

    color += texture(uSampler, uv * vec2(0.5,2.0) - vec2(0, 0.2*uTime.x));
    color *= 4.0 * texture(uSampler, uv * vec2(0.2,0.5) - vec2(0, 0.1*uTime.x));

    

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