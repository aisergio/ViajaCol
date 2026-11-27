import {
  DetailPage,
  detailMetadata,
  detailParams,
  type SlugProps,
} from '@/components/catalog/pages';

export const dynamicParams = false;

export function generateStaticParams() {
  return detailParams('regiones');
}

export function generateMetadata(props: SlugProps) {
  return detailMetadata('regiones', props);
}

export default function Page(props: SlugProps) {
  return <DetailPage category="regiones" params={props.params} />;
}
