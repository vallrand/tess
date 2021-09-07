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
float linearizeDepth(mat4 projectionMatrix){
    //float near = projectionMatrix[2][3] / (projectionMatrix[2][2] - 1.0);
    //float far = projectionMatrix[2][3] / (projectionMatrix[2][2] + 1.0);
    float z_ndc = gl_FragCoord.z * 2.0 - 1.0;
    //float linearDepth = (2.0 * near * far) / (far + near - z_ndc * (far - near));
    float linearDepth = projectionMatrix[2][3] / (projectionMatrix[2][2] + z_ndc);
    return linearDepth;
}

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

#ifdef FRESNEL
    vec3 position = vPosition;
    vec3 normal = normalize(vNormal);
    vec3 view = normalize(uEyePosition - position);
    float NdV = abs(dot(normal, view));
    color *= smoothstep(uFresnelMask.x,uFresnelMask.y,NdV);
#endif

    float value = color.a;
#ifdef GRADIENT
    color = texture(uGradientMap, vec2(1.-value,vColor.a));
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
    //TODO linearize depth first
    gl_FragDepth = gl_FragCoord.z - DEPTH_OFFSET;
#endif
}