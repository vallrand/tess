ivec2 fragCoord = ivec2(gl_FragCoord.xy);
vec3 viewRay = vPosition.xyz - uEyePosition;
vec4 worldPosition = texelFetch(uPositionBuffer, fragCoord, 0);
if(worldPosition.a > uLayer) discard;
vec4 objectPosition = vInvModel * vec4(worldPosition.xyz + uEyePosition, 1.0);
if(0.5 < abs(objectPosition.x) || 0.5 < abs(objectPosition.y) || 0.5 < abs(objectPosition.z)) discard;
vec2 uv = mix(vUV.xy, vUV.zw, objectPosition.xz + 0.5);