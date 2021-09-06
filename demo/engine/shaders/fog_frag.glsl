#version 300 es
precision highp float;
in vec2 vUV;
out vec4 fragColor;

#define LOG2 1.4426950408889634

uniform CameraUniforms {
    mat4 uViewProjectionMatrix;
    mat4 uViewMatrix;
    vec3 uEyePosition;
};

uniform sampler2D uSampler;
uniform sampler2D uPositionBuffer;
#ifdef BLOOM
uniform sampler2D uBloomMap;
uniform vec4 uBloomMask;
#endif

#if defined(LINEAR_FOG)
uniform vec4 uFogColor;
uniform vec2 uFogRange;
#elif defined(EXPONENTIAL_FOG)
uniform vec4 uFogColor;
uniform float uFogDensity;
#endif

#ifdef HALFSPACE
uniform vec2 uFogHeight;
float halfspace(vec3 origin, vec3 position, vec3 ray, float fogHeight, float fogDensity){
    float fdc = origin.y-fogHeight;
    float fdp = position.y-fogHeight;
    float fdv = position.y-origin.y;
    float k = step(fdc,0.);
    float c1 = k * (fdp + fdc);
    float c2 = (1.-2.*k) * fdp;
    float g = min(c2, 0.0);
    g = -length(.5*fogDensity * ray) * (c1 - g * g / abs(fdv+1.0e-5f));
    return g;
}
#endif

void main(){
    ivec2 fragCoord = ivec2(gl_FragCoord.xy);
    vec4 color = texelFetch(uSampler, fragCoord, 0);

    vec4 position = texelFetch(uPositionBuffer, fragCoord, 0);
    color = mix(color, uFogColor, step(position.a,.5));
    vec3 viewRay = position.xyz - uEyePosition;
    float distance = length(viewRay);

#ifdef HALFSPACE
    distance += halfspace(uEyePosition, position.xyz, viewRay, uFogHeight.x, uFogHeight.y);
#endif

#if defined(LINEAR_FOG)
    float fogAmount = 1.-smoothstep(uFogRange.x, uFogRange.y, distance);
    color = mix(uFogColor, color, fogAmount);
#elif defined(EXP_FOG)
    float fogAmount = clamp(exp2(-uFogDensity * distance * LOG2)),0.,1.);
    //float fogAmount = (a/b) * exp(-uEyePosition.y*uFogDensity) * (1.0-exp( -distance*viewRay.y*uFogDensity ))/viewRay.y;
    color = mix(uFogColor, color, fogAmount);
#elif defined(EXP2_FOG)
    float fogAmount = clamp(exp2(-uFogDensity*uFogDensity * distance*distance * LOG2)),0.,1.);
    color = mix(uFogColor, color, fogAmount);
#endif

#ifdef BLOOM
    vec4 bloom = uBloomMask * texture(uBloomMap, vUV);
    color += bloom;
#endif
    fragColor = color;
}