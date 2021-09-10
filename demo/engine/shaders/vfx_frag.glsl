#version 300 es
precision highp float;
precision highp int;

in vec2 vUV;
in vec3 vPosition;
in vec3 vNormal;
in vec4 vColor;
in float vMaterial;
out vec4 fragColor;

uniform GlobalUniforms {
    vec4 uTime;
};
uniform CameraUniforms {
    mat4 uViewProjectionMatrix;
    mat4 uProjectionMatrix;
    mat4 uViewMatrix;
    vec3 uEyePosition;
};

uniform sampler2D uDiffuseMap;
uniform sampler2D uGradientMap;
uniform sampler2D uDisplacementMap;

uniform EffectUniforms {
    uniform vec4 uUVTransform;
    uniform vec3 uColorAdjustment;
#ifdef VERTICAL_MASK
    uniform vec4 uVerticalMask;
#endif
#ifdef HORIZONTAL_MASK
    uniform vec4 uHorizontalMask;
#endif
#ifdef FRESNEL
    uniform vec2 uFresnelMask;
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
float linearizeDepth(){
    float z_ndc = gl_FragCoord.z * 2.0 - 1.0;
    //float linearDepth = (2.0 * near * far) / (far + near - z_ndc * (far - near));
    float linearDepth = uProjectionMatrix[2][3] / (uProjectionMatrix[2][2] + z_ndc);
    return linearDepth;
}
float projectDepth(in float z){
    float z_ndc = uProjectionMatrix[2][3] / z - uProjectionMatrix[2][2];
    return .5+.5*z_ndc;
}

void main(){
    vec2 uv = vUV;
#ifdef HALF
    uv.y = abs(uv.y*2.-1.);
#endif
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
    grey = pow(clamp(mix(1.-grey,grey,uColorAdjustment.y),0.,1.), uColorAdjustment.x)+uColorAdjustment.z;

    vec2 uv2 = uUV2Transform.xy + uv * uUV2Transform.zw;
#ifdef PANNING
    uv2 += uTime.x * uUV2Panning.xy;
#endif
    float grey2 = texture(uDiffuseMap, uv2).g;
    grey2 = pow(clamp(mix(1.-grey2,grey2,uColorAdjustment.y),0.,1.), uColorAdjustment.x)+uColorAdjustment.z;
    grey *= 2.0 * grey2;

    vec4 color = vec4(min(1.,grey));
#else
    vec4 color = texture(uDiffuseMap, uv0);
#endif

#ifdef DISSOLVE
    color += max(0.,-uDissolveThreshold.x);
#endif

#ifdef VERTICAL_MASK
    color *= smoothstep(uVerticalMask.x,uVerticalMask.y,uv.y);
    color *= smoothstep(uVerticalMask.w,uVerticalMask.z,uv.y);
#endif
#ifdef HORIZONTAL_MASK
    color *= smoothstep(uHorizontalMask.x,uHorizontalMask.y,uv.x);
    color *= smoothstep(uHorizontalMask.w,uHorizontalMask.z,uv.x);
#endif

#ifdef FRESNEL
    vec3 position = vPosition;
    vec3 normal = normalize(vNormal);
    vec3 view = normalize(uEyePosition - position);
    float NdV = abs(dot(normal, view));
    color *= smoothstep(uFresnelMask.x,uFresnelMask.y,NdV);
#endif

    float value = color.a;
#ifdef GRADIENT
#ifdef DISSOLVE
    color = texture(uGradientMap, vec2(1.-value,vColor.a));
#else
    color = texture(uGradientMap, vec2(1.-value,uv.y));
#endif
#endif

#ifdef DISSOLVE
    float cutoff = uDissolveThreshold.x + 1. - vColor.a;
    color = mix(color, uDissolveColor, smoothstep(-uDissolveThreshold.z,0.,cutoff-value));
    color.rgb *= vColor.rgb;
    color *= smoothstep(0.,uDissolveThreshold.y,value-cutoff);
#else
    color *= vColor;
#endif
    fragColor = color;

#ifdef DEPTH_OFFSET
    gl_FragDepth = projectDepth(linearizeDepth() - DEPTH_OFFSET);
#endif
}