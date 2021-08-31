#version 300 es
precision highp float;
precision highp int;

in vec2 vUV;
in vec3 vPosition;
in vec4 vColor;
in vec3 vNormal;
in float vMaterial;
out vec4 fragColor;

uniform GlobalUniforms {
    vec4 uTime;
};
uniform CameraUniforms {
    mat4 uViewProjectionMatrix;
    mat4 uViewMatrix;
    vec3 uEyePosition;
};

uniform sampler2D uDiffuseMap;
uniform sampler2D uGradientMap;
uniform sampler2D uDisplacementMap;

uniform EffectUniforms {
    uniform vec4 uUVTransform;
    uniform vec2 uColorAdjustment;
#ifdef VERTICAL_MASK
    uniform vec4 uVerticalMask;
#endif
#ifdef PANNING
    uniform vec2 uUVPanning;
#endif
#ifdef GREYSCALE
    uniform vec4 uUV2Transform;
#ifdef PANNING
    uniform vec2 uUV2Panning;
#endif
#endif
#ifdef DISPLACEMENT
    uniform vec4 uUVTransform2;
    uniform vec2 uPanning2;
    uniform float uDisplacementAmount;
#endif
#ifdef DISSOLVE
    uniform vec4 uDissolveColor;
    uniform vec3 uDissolveThreshold;
#endif
};

#define TAU 6.283185307179586

void main(){
    vec2 uv = vUV;
#ifdef POLAR
    uv=uv*2.-1.;uv=vec2(atan(uv.y,uv.x)/TAU+.5,length(uv));
#endif
    vec2 uv0 = uUVTransform.xy + uv * uUVTransform.zw;
#ifdef PANNING
    uv0 += uTime.x * uUVPanning.xy;
#endif

#ifdef DISPLACEMENT
    vec2 uv2 = uUVTransform2.xy + uv * uUVTransform2.zw;
    vec2 displacement = uDisplacementAmount*(texture(uDisplacementMap, uv2).xy*2.-1.);
    uv0 += displacement;
#endif

#ifdef GREYSCALE
    float grey = texture(uDiffuseMap, uv0).r;
    grey = pow(clamp(mix(.5,grey,uColorAdjustment.y),0.,1.), uColorAdjustment.x);

    vec2 uv2 = uUV2Transform.xy + uv * uUV2Transform.zw;
#ifdef PANNING
    uv2 += uTime.x * uUV2Panning.xy;
#endif
    float grey2 = texture(uDiffuseMap, uv2).g;
    grey2 = pow(clamp(mix(.5,grey2,uColorAdjustment.y),0.,1.), uColorAdjustment.x);
    grey *= 2.0 * grey2;

    vec4 color = vec4(grey);
#else
    vec4 color = texture(uDiffuseMap, uv0);
#endif

#ifdef VERTICAL_MASK
    color *= smoothstep(uVerticalMask.x,uVerticalMask.y,uv.y);
    color *= smoothstep(uVerticalMask.w,uVerticalMask.z,uv.y);
#endif

    float value = color.a;
#ifdef GRADIENT
    color = texture(uGradientMap, vec2(1.-value,uv.y));
#endif

#ifdef DISSOLVE
    float cutoff = uDissolveThreshold.x + 1. - vColor.a;
    color = mix(color, uDissolveColor, smoothstep(-uDissolveThreshold.z,0.,cutoff-value));
    color.rgb *= vColor.rgb;
    color *= smoothstep(0.,uDissolveThreshold.y,value-cutoff);
#endif
    fragColor = color;
}