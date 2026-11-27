import {
  DetailPage,
  detailMetadata,
  detailParams,
  type SlugProps,
} from '@/components/catalog/pages';

export const dynamicParams = false;

export function generateStaticParams() {
  return detailParams('experiencias');
}

export function generateMetadata(props: SlugProps) {
  return detailMetadata('experiencias', props);
}

export default function Page(props: SlugProps) {
  return <DetailPage category="experiencias" params={props.params} />;
}
