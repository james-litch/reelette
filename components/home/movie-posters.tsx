import Image from "next/image"

export function MoviePosters() {
  return (
    <div aria-hidden="true" className="relative mt-14 w-full max-w-lg sm:mt-16">
      <div className="absolute top-6 left-1 w-1/2 -rotate-9 overflow-hidden rounded-xl shadow-xl sm:top-9 sm:rounded-2xl">
        <Image
          src="/images/posters/dune-part-two.jpg"
          alt=""
          width={500}
          height={750}
          sizes="(max-width: 640px) 138px, 224px"
          className="aspect-2/3 w-full object-cover"
        />
      </div>
      <div className="absolute top-6 right-1 w-1/2 rotate-9 overflow-hidden rounded-xl shadow-xl sm:top-9 sm:rounded-2xl">
        <Image
          src="/images/posters/barbie.jpg"
          alt="Barbie movie poster"
          width={500}
          height={750}
          sizes="(max-width: 640px) 138px, 224px"
          className="aspect-2/3 w-full object-cover"
        />
      </div>
      <div className="absolute inset-x-0 top-0 mx-auto w-1/2 overflow-hidden rounded-xl shadow-2xl sm:rounded-2xl">
        <Image
          src="/images/posters/interstellar.jpg"
          alt="Interstellar movie poster"
          width={500}
          height={750}
          sizes="(max-width: 640px) 141px, 229px"
          preload
          className="aspect-2/3 w-full object-cover"
        />
      </div>
    </div>
  )
}
