import { ListPage, listMetadata, type LocaleProps } from '@/components/catalog/pages';

export function generateMetadata(props: LocaleProps) {
  return listMetadata('regiones', props);
}

export default function Page(props: LocaleProps) {
  return <ListPage category="regiones" params={props.params} />;
}
