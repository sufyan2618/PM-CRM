import { Lottie } from "lottie-react";

type LottiePlayerProps = {
  src: string;
  className?: string;
  segment?: readonly [number, number];
};

export function LottiePlayer({ src, className, segment }: LottiePlayerProps) {
  return <Lottie className={className} src={src} autoplay loop segment={segment} />;
}
